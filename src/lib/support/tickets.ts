import { z } from "zod";

export const TICKET_STATUSES = ["Open", "In Progress", "Resolved"] as const;
// Fail closed: omit an entire message, not just a guessed secret value.
const sensitive = /\b(password|passcode|passwd|pwd|otp|one[ -]?time|verification[ -]?code|security[ -]?code|cvv|cvc|pin|card[ -]?(number|details))\b|\d[\d\s-]{10,}\d|\b\d{3,8}\b/i;
export const containsSensitiveData = (value: string) => sensitive.test(value);
const safeText = (max: number) => z.string().trim().max(max).refine((value) => !containsSensitiveData(value), "Remove passwords, codes and payment details before submitting.");
export const ticketInputSchema = z.object({
  requestId: z.string().uuid(),
  conversationId: z.string().uuid(),
  name: safeText(100).optional().default(""),
  email: z.union([z.literal(""), z.string().trim().email().max(255)]).optional().default(""),
  reason: safeText(2000).refine((value) => value.length > 0, "Enter a reason for contacting support."),
  messages: z.array(z.object({ role: z.enum(["customer", "assistant"]), text: z.string().max(2000) }).strict()).max(10),
}).strict().refine((value) => !containsSensitiveData(value.email), { path: ["email"], message: "Remove sensitive details from the email field." });
export type TicketInput = z.input<typeof ticketInputSchema>;
export interface SupportTicket {
  id: string; reference: string; reason: string; status: typeof TICKET_STATUSES[number]; created_at: string;
}
export const TICKET_SAVE_ERROR = "We couldn’t confirm your support request was saved. Please retry; retrying won’t create a duplicate request.";
export type SaveTicketResult = { ok: true; ticket: SupportTicket } | { ok: false; error: string };

export function safeConversation(messages: { role: string; text: string }[]) {
  return messages.filter((m) => !containsSensitiveData(m.text)).map((m) => `${m.role}: ${m.text}`).join("\n");
}

export interface TicketStore {
  find: (userId: string, requestId: string) => Promise<SupportTicket | null>;
  insert: (row: { user_id: string; request_id: string; conversation_id: string; name: string | null; email: string | null; reason: string; context: string }) => Promise<SupportTicket>;
}

/** Authenticated identity is supplied by the server, never the form. */
export async function saveTicket(input: unknown, userId: string, store: TicketStore): Promise<SaveTicketResult> {
  if (!userId) return { ok: false, error: "Sign in to save a private support request." };
  const parsed = ticketInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your request." };
  const data = parsed.data;
  try {
    const existing = await store.find(userId, data.requestId);
    if (existing) return { ok: true, ticket: existing };
    const ticket = await store.insert({ user_id: userId, request_id: data.requestId, conversation_id: data.conversationId,
      name: data.name || null, email: data.email || null, reason: data.reason, context: safeConversation(data.messages) });
    return { ok: true, ticket };
  } catch {
    // A response may have been lost after commit, or concurrent requests may have raced.
    try { const existing = await store.find(userId, data.requestId); if (existing) return { ok: true, ticket: existing }; } catch { /* no private error details */ }
    return { ok: false, error: TICKET_SAVE_ERROR };
  }
}

export const statusInputSchema = z.object({ id: z.string().uuid(), status: z.enum(TICKET_STATUSES) }).strict();
export function canChangeTicketStatus(isStaff: boolean) { return isStaff; }