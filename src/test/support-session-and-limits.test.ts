import { describe, expect, it } from "vitest";
import { checkChatQuota, quotaBucket, clientAddress, CHAT_LIMITS, DUPLICATE_MESSAGE, type QuotaStore } from "@/lib/support/rate-limit";
import { shouldResetPrivateSession } from "@/lib/support/privacy";

/** In-memory mirror of the database quota function for rule tests. */
function memoryStore(now: () => number): QuotaStore {
  const rows = new Map<string, { start: number; count: number; blocked: number; hash?: string; at: number }>();
  return { consume: async (a) => {
    const t = now(); const r = rows.get(a.bucket) ?? { start: t, count: 0, blocked: 0, at: 0 }; rows.set(a.bucket, r);
    if (r.blocked > t) return { outcome: "limited", retryAfter: Math.ceil((r.blocked - t) / 1000) };
    if (r.hash === a.hash && r.at > t - a.duplicateSeconds * 1000) return { outcome: "duplicate", retryAfter: a.duplicateSeconds };
    if (r.start <= t - a.windowSeconds * 1000) { r.start = t; r.count = 0; }
    if (r.count >= a.limit) { r.blocked = t + a.cooldownSeconds * 1000; r.count = 0; r.start = t; return { outcome: "limited", retryAfter: a.cooldownSeconds }; }
    r.count++; r.hash = a.hash; r.at = t; return { outcome: "allowed", retryAfter: 0 };
  } };
}

describe("AI chat rate limiting", () => {
  it("allows 20 anonymous messages per 10 minutes, then a 5-minute cooldown", async () => {
    let t = 0; const store = memoryStore(() => t);
    for (let i = 0; i < 20; i++) { t += 11000; expect((await checkChatQuota({ userId: null, address: "1.2.3.4", latestMessage: `q${i}` }, store)).ok).toBe(true); }
    t += 11000; const blocked = await checkChatQuota({ userId: null, address: "1.2.3.4", latestMessage: "q20" }, store);
    expect(blocked).toMatchObject({ ok: false }); expect(!blocked.ok && blocked.error).toContain("5 minute");
    t += 299000; expect((await checkChatQuota({ userId: null, address: "1.2.3.4", latestMessage: "x" }, store)).ok).toBe(false);
    t += 2000; expect((await checkChatQuota({ userId: null, address: "1.2.3.4", latestMessage: "y" }, store)).ok).toBe(true);
  });
  it("gives signed-in customers 40 messages and their own bucket", async () => {
    expect(CHAT_LIMITS.signedIn.limit).toBe(40);
    let t = 0; const store = memoryStore(() => t);
    for (let i = 0; i < 20; i++) { t += 11000; await checkChatQuota({ userId: null, address: "9.9.9.9", latestMessage: `a${i}` }, store); }
    t += 11000; expect((await checkChatQuota({ userId: "customer-a", address: "9.9.9.9", latestMessage: "b" }, store)).ok).toBe(true);
  });
  it("rejects an identical message resent within 10 seconds", async () => {
    let t = 0; const store = memoryStore(() => t);
    await checkChatQuota({ userId: null, address: "1.1.1.1", latestMessage: "Shipping?" }, store);
    t += 3000; expect(await checkChatQuota({ userId: null, address: "1.1.1.1", latestMessage: " shipping? " }, store)).toEqual({ ok: false, error: DUPLICATE_MESSAGE });
    t += 8000; expect((await checkChatQuota({ userId: null, address: "1.1.1.1", latestMessage: "Shipping?" }, store)).ok).toBe(true);
  });
  it("hashes visitor addresses and never stores them raw", async () => {
    const bucket = await quotaBucket(null, "203.0.113.5");
    expect(bucket).toMatch(/^ip:[0-9a-f]{64}$/); expect(bucket).not.toContain("203.0.113.5");
    expect(clientAddress(new Headers({ "cf-connecting-ip": "203.0.113.5", "x-forwarded-for": "6.6.6.6" }))).toBe("203.0.113.5");
  });
  it("does not block customers when the limiter is unavailable", async () => {
    expect(await checkChatQuota({ userId: null, address: "x", latestMessage: "hi" }, { consume: async () => { throw new Error("down"); } })).toEqual({ ok: true });
  });
});

describe("Logout session invalidation", () => {
  it("clears private conversation state on logout", () => {
    expect(shouldResetPrivateSession("customer-a", null)).toBe(true);
  });
});
