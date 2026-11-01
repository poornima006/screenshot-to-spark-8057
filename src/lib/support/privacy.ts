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