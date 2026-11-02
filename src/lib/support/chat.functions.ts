import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateResponse, GatewayError } from "@lovable.dev/ai-gateway";
import { answerWithRetrieval } from "./rag-workflow";
import type { PolicySource } from "./rag-answer";
import { preparePrivateChat, PRIVATE_INPUT_MESSAGE } from "./privacy";
import { getRequest } from "@tanstack/react-start/server";
import { checkChatQuota, clientAddress } from "./rate-limit";

const messageSchema = z.object({
  role: z.enum(["customer", "assistant"]),
  text: z.string().trim().min(1).max(2000),
});

const inputSchema = z.object({
  messages: z.array(messageSchema).min(1).max(50),
});

export const AI_UNAVAILABLE_MESSAGE =
  "Sorry, I couldn't reach the support assistant just now. Please try again in a moment, or use the Talk to Human button above.";

type SupportResult = { ok: true; reply: string; sources: PolicySource[]; retrievedSources: PolicySource[] } | { ok: false; error: string };

/** Extracts the assistant text from a Responses API result. */
function extractReply(response: unknown): string {
  const output = (response as { output?: unknown })?.output;
  if (!Array.isArray(output)) return "";
  const parts: string[] = [];
  for (const item of output) {
    const message = item as { type?: string; content?: unknown };
    if (message?.type !== "message" || !Array.isArray(message.content)) continue;
    for (const block of message.content) {
      const text = (block as { type?: string; text?: unknown })?.text;
      if ((block as { type?: string })?.type === "output_text" && typeof text === "string") {
        parts.push(text);
      }
    }
  }
  return parts.join("\n").trim();
}

export const askSupport = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<SupportResult> => {
    const privateChat = preparePrivateChat(data.messages);
    if (privateChat.blocked) return { ok: false, error: PRIVATE_INPUT_MESSAGE };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const request = getRequest();
    const auth = request.headers.get("authorization") ?? "";
    let userId: string | null = null;
    if (auth.startsWith("Bearer ") && auth.split(".").length === 3) {
      // Verified against the auth service, so revoked or forged tokens fall back to the anonymous limit.
      const { data: user } = await supabaseAdmin.auth.getUser(auth.slice(7)).catch(() => ({ data: { user: null } }));
      userId = user.user?.id ?? null;
    }
    const quota = await checkChatQuota({ userId, address: clientAddress(request.headers), latestMessage: data.messages.at(-1)!.text }, {
      consume: async (a) => {
        const { data: rows, error } = await supabaseAdmin.rpc("consume_chat_quota", { _bucket: a.bucket, _hash: a.hash, _limit: a.limit, _window_seconds: a.windowSeconds, _cooldown_seconds: a.cooldownSeconds, _duplicate_seconds: a.duplicateSeconds });
        if (error || !rows?.[0]) throw new Error("quota");
        return { outcome: rows[0].outcome as "allowed" | "limited" | "duplicate", retryAfter: rows[0].retry_after };
      },
    });
    if (!quota.ok) return { ok: false, error: quota.error };
    try {
      const answer = await answerWithRetrieval(privateChat.messages, async ({ instructions, messages }) => {
        const response = await generateResponse({
          model: "openai/gpt-6-astra",
          instructions,
          input: messages.map((m) => ({
            role: m.role === "customer" ? ("user" as const) : ("assistant" as const),
            content: m.text,
          })),
          text: {
            format: {
              type: "json_schema",
              name: "support_source_selection",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  sourceIds: { type: "array", items: { type: "string" } },
                  unavailable: { type: "boolean" },
                },
                required: ["sourceIds", "unavailable"],
                additionalProperties: false,
              },
            },
          },
        });
        const reply = extractReply(response);
        if (!reply) throw new Error("Empty support selection");
        return JSON.parse(reply) as unknown;
      });
      return { ok: true, ...answer };
    } catch (error) {
      if (error instanceof GatewayError) {
        console.error(`AI Gateway error (${error.code})`);
      } else {
        console.error("Support generation failed");
      }
      return { ok: false, error: AI_UNAVAILABLE_MESSAGE };
    }
  });
