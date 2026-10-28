import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateResponse, GatewayError } from "@lovable.dev/ai-gateway";
import { answerWithRetrieval } from "./rag-workflow";
import type { PolicySource } from "./rag-answer";

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
    try {
      const answer = await answerWithRetrieval(data.messages, async ({ instructions, messages }) => {
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
        console.error(`AI Gateway error (${error.code}): ${error.message}`);
      } else {
        console.error(error);
      }
      return { ok: false, error: AI_UNAVAILABLE_MESSAGE };
    }
  });
