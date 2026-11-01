import { describe, expect, it } from "vitest";
import { preparePrivateChat, shouldResetPrivateSession } from "@/lib/support/privacy";
import { saveTicket, type TicketStore } from "@/lib/support/tickets";

describe("Support security boundaries", () => {
  it.each(["My password is secret", "OTP 654321", "CVV 987", "4111 1111 1111 1111"])("blocks sensitive chat before generation: %s", (text) => {
    expect(preparePrivateChat([{ role: "customer", text }])).toEqual({ blocked: true, messages: [] });
  });
  it("omits old secrets and personal email from AI history", () => {
    expect(preparePrivateChat([{ role: "customer", text: "password secret" }, { role: "customer", text: "Shipping for me@example.com?" }])).toEqual({ blocked: false, messages: [{ role: "customer", text: "Shipping for [email omitted]?" }] });
  });
  it("resets conversations on logout and cross-account changes", () => {
    expect(shouldResetPrivateSession("customer-a", null)).toBe(true);
    expect(shouldResetPrivateSession("customer-a", "customer-b")).toBe(true);
    expect(shouldResetPrivateSession("customer-a", "customer-a")).toBe(false);
    expect(shouldResetPrivateSession(null, "customer-a")).toBe(false);
  });
  it("uses owner-scoped idempotency lookup even for shared request IDs", async () => {
    const owners: string[] = [];
    const db: TicketStore = { find: async (owner) => { owners.push(owner); return null; }, insert: async () => { throw new Error("unavailable"); } };
    await saveTicket({ requestId: "8cd6840f-8eec-4ea5-bfab-cb9c9f3346bb", conversationId: "4fe9a0f5-eb51-4dfa-a37f-2799a8ffca5e", reason: "Help", messages: [] }, "customer-b", db);
    expect(owners).toEqual(["customer-b", "customer-b"]);
  });
});