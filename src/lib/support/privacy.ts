import { containsSensitiveData } from "./tickets";

export const PRIVATE_INPUT_MESSAGE = "Please remove passwords, OTPs, CVVs and payment-card details before sending your question. You can use Talk to Human for support.";
export function preparePrivateChat(messages: { role: "customer" | "assistant"; text: string }[]) {
  const latest = messages.at(-1);
  if (latest && containsSensitiveData(latest.text)) return { blocked: true as const, messages: [] };
  return { blocked: false as const, messages: messages.filter((message) => !containsSensitiveData(message.text)).map((message) => ({
    ...message, text: message.text.replace(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email omitted]"),
  })) };
}

export function shouldResetPrivateSession(previous: string | null, next: string | null) {
  return previous !== null && previous !== next;
}
/** Reads the session ID claim from an access token without trusting it; the database re-checks it against the verified token. */
export function sessionIdFromToken(token: string | undefined | null): string | null {
  const part = token?.split(".")[1];
  if (!part) return null;
  try {
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=")));
    return typeof json.session_id === "string" && /^[0-9a-f-]{36}$/i.test(json.session_id) ? json.session_id : null;
  } catch { return null; }
}

/** A session counts as live only when the auth service accepts the token and it has not been revoked at logout. */
export function isSessionAllowed(check: { userValid: boolean; notRevoked: boolean | null }) {
  return check.userValid && check.notRevoked === true;
}
