/** Server-side request limits for the public support chat. */
export const CHAT_LIMITS = {
  anonymous: { limit: 20, windowSeconds: 600 },
  signedIn: { limit: 40, windowSeconds: 600 },
  cooldownSeconds: 300,
  duplicateSeconds: 10,
} as const;

export const RATE_LIMIT_MESSAGE = (retryAfter: number) =>
  `You've sent a lot of messages in a short time. Please wait about ${Math.max(1, Math.ceil(retryAfter / 60))} minute(s) and try again, or use the Talk to Human button above.`;
export const DUPLICATE_MESSAGE = "That question is already being answered. Please wait a moment before sending it again.";

export type QuotaOutcome = { outcome: "allowed" | "limited" | "duplicate"; retryAfter: number };
export interface QuotaStore {
  consume(args: { bucket: string; hash: string; limit: number; windowSeconds: number; cooldownSeconds: number; duplicateSeconds: number }): Promise<QuotaOutcome>;
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Picks the client network address from trusted edge headers. */
export function clientAddress(headers: Headers) {
  return headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers.get("x-real-ip") ?? "unknown";
}

/** Verified accounts get their own bucket; anonymous visitors are bucketed by hashed network address. */
export async function quotaBucket(userId: string | null, address: string) {
  return userId ? `user:${userId}` : `ip:${await sha256(`shopease-chat:${address}`)}`;
}

export async function checkChatQuota(
  input: { userId: string | null; address: string; latestMessage: string },
  store: QuotaStore,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tier = input.userId ? CHAT_LIMITS.signedIn : CHAT_LIMITS.anonymous;
  const bucket = await quotaBucket(input.userId, input.address);
  const hash = await sha256(input.latestMessage.trim().toLowerCase());
  let result: QuotaOutcome;
  try {
    result = await store.consume({ bucket, hash, ...tier, cooldownSeconds: CHAT_LIMITS.cooldownSeconds, duplicateSeconds: CHAT_LIMITS.duplicateSeconds });
  } catch {
    // Fail open so a limiter outage never blocks genuine customers.
    console.error("Chat quota check unavailable");
    return { ok: true };
  }
  if (result.outcome === "allowed") return { ok: true };
  return { ok: false, error: result.outcome === "duplicate" ? DUPLICATE_MESSAGE : RATE_LIMIT_MESSAGE(result.retryAfter) };
}
