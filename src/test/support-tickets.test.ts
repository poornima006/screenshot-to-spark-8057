import { describe, it, expect, vi } from "vitest";
import { saveTicket, safeConversation, ticketInputSchema, TICKET_SAVE_ERROR, TICKET_STATUSES, canChangeTicketStatus, statusInputSchema, type TicketStore } from "@/lib/support/tickets";

const input = { requestId: "8cd6840f-8eec-4ea5-bfab-cb9c9f3346bb", conversationId: "4fe9a0f5-eb51-4dfa-a37f-2799a8ffca5e", reason: "I need help with the return conditions", messages: [{ role: "customer" as const, text: "How can I return a product?" }] };
const ticket = { id: "1bbfcb6c-e235-4c7e-9cee-cd1b9a742f3e", reference: "SE-1BBFCB6C-E235-4C7E-9CEE-CD1B9A742F3E", reason: input.reason, status: "Open" as const, created_at: "2026-10-29T04:42:00Z" };
const store = (): TicketStore => ({ find: vi.fn().mockResolvedValue(null), insert: vi.fn().mockResolvedValue(ticket) });
describe("Private support tickets", () => {
  it("creates an Open ticket with optional contact fields and the server owner", async () => {
    const db = store(); expect(await saveTicket(input, "owner", db)).toEqual({ ok: true, ticket });
    expect(db.insert).toHaveBeenCalledWith({ user_id: "owner", request_id: input.requestId, conversation_id: input.conversationId, name: null, email: null, reason: input.reason, context: "customer: How can I return a product?" });
  });
  it("rejects an empty reason before saving", async () => { const db = store(); expect((await saveTicket({ ...input, reason: " " }, "owner", db)).ok).toBe(false); expect(db.insert).not.toHaveBeenCalled(); });
  it("rejects invalid email", () => { expect(ticketInputSchema.safeParse({ ...input, email: "bad" }).success).toBe(false); });
  it("enforces field and context limits", () => {
    expect(ticketInputSchema.safeParse({ ...input, reason: "a".repeat(2001) }).success).toBe(false);
    expect(ticketInputSchema.safeParse({ ...input, name: "a".repeat(101) }).success).toBe(false);
    expect(ticketInputSchema.safeParse({ ...input, messages: Array(11).fill(input.messages[0]) }).success).toBe(false);
  });
  it.each(["password is secret", "OTP 123456", "CVV 123", "card number 4111 1111 1111 1111", "123456", "verification code is secret", "PIN 1234"])("rejects sensitive reason: %s", async (reason) => {
    const db = store(); expect((await saveTicket({ ...input, reason }, "owner", db)).ok).toBe(false); expect(db.insert).not.toHaveBeenCalled();
  });
  it("omits whole sensitive messages while keeping safe context", async () => {
    const db = store(); await saveTicket({ ...input, messages: [...input.messages, { role: "customer", text: "my password is super-secret" }, { role: "customer", text: "4111111111111111" }] }, "owner", db);
    expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({ context: "customer: How can I return a product?" }));
    expect(safeConversation([{ role: "customer", text: "OTP is abc" }])).toBe("");
  });
  it("rejects unauthenticated saves", async () => { const db = store(); expect((await saveTicket(input, "", db)).ok).toBe(false); expect(db.find).not.toHaveBeenCalled(); });
  it("rejects forged ownership and initial status", () => {
    expect(ticketInputSchema.safeParse({ ...input, user_id: "victim" }).success).toBe(false);
    expect(ticketInputSchema.safeParse({ ...input, status: "Resolved" }).success).toBe(false);
  });
  it("returns honest retry failure, not a ticket, when saving fails", async () => {
    const db = store(); vi.mocked(db.insert).mockRejectedValue(new Error("private database detail"));
    expect(await saveTicket(input, "owner", db)).toEqual({ ok: false, error: TICKET_SAVE_ERROR });
  });
  it("returns the same ticket on retry without inserting again", async () => {
    const db = store(); vi.mocked(db.find).mockResolvedValue(ticket);
    expect(await saveTicket(input, "owner", db)).toEqual({ ok: true, ticket }); expect(db.insert).not.toHaveBeenCalled();
  });
  it("recovers a lost response after the database committed", async () => {
    const db = store(); vi.mocked(db.find).mockResolvedValueOnce(null).mockResolvedValueOnce(ticket); vi.mocked(db.insert).mockRejectedValue(new Error("lost response"));
    expect(await saveTicket(input, "owner", db)).toEqual({ ok: true, ticket });
  });
  it("supports exactly Open, In Progress, Resolved", () => {
    expect(TICKET_STATUSES).toEqual(["Open", "In Progress", "Resolved"]);
    for (const status of TICKET_STATUSES) expect(statusInputSchema.safeParse({ id: ticket.id, status }).success).toBe(true);
    expect(statusInputSchema.safeParse({ id: ticket.id, status: "Closed" }).success).toBe(false);
  });
  it("permits status changes only for authorized support staff", () => { expect(canChangeTicketStatus(false)).toBe(false); expect(canChangeTicketStatus(true)).toBe(true); });
});