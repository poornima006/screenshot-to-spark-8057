/**
 * ShopEase knowledge base — the fictional company policies behind the demo answers.
 * This file is the single source of truth for demo replies. A real document store /
 * retrieval step can replace it later without touching the chat UI.
 *
 * Rules:
 * - `summary` holds the policy text verbatim; never add numbers that are not stated here.
 * - `note` is for honesty caveats only: it must never state a customer-specific
 *   order status, refund confirmation, or a policy that does not exist above.
 */
export type PolicyTopic = "shipping" | "returns" | "refunds" | "payments" | "cancellations";

export interface PolicyEntry {
  topic: PolicyTopic;
  title: string;
  keywords: string[];
  summary: string;
  note?: string;
}

export const knowledgeBase: PolicyEntry[] = [
  {
    topic: "shipping",
    title: "Shipping",
    keywords: ["ship", "shipping", "delivery", "deliver", "dispatch"],
    summary: "Standard delivery usually takes 3–5 business days after dispatch.",
    note: "We can't confirm the exact delivery date for a specific order here — ShopEase customer support can check that for you.",
  },
  {
    topic: "returns",
    title: "Returns",
    keywords: ["return", "returns", "send back", "exchange"],
    summary: "Eligible products can be returned within 7 days of delivery if they meet the return conditions.",
    note: "The full return conditions aren't available here — ShopEase customer support can confirm whether your item is eligible.",
  },
  {
    topic: "refunds",
    title: "Refunds",
    keywords: ["refund", "refunds", "money back", "reimburse"],
    summary: "Refunds are processed within 5–7 business days after the return is approved.",
    note: "We can't confirm the status of a specific refund here — ShopEase customer support can check that for you.",
  },
  {
    topic: "payments",
    title: "Payment methods",
    keywords: ["pay", "payment", "payments", "upi", "debit", "credit", "net banking", "bank"],
    summary: "ShopEase accepts UPI, debit cards, credit cards and net banking.",
  },
  {
    topic: "cancellations",
    title: "Cancellations",
    keywords: ["cancel", "cancellation", "cancelled", "cancel my order"],
    summary: "Customers can request cancellation before dispatch. Orders already dispatched may not be eligible.",
    note: "We can't check or cancel a specific order here — ShopEase customer support can help with that.",
  },
];

/**
 * Questions about a particular order or refund. The demo has no order data, so these
 * are answered with the "unavailable" message instead of a policy guess.
 * Kept deliberately narrow so general policy questions still match above.
 */
const ORDER_SPECIFIC_PHRASES = [
  "order status",
  "status of my order",
  "track my order",
  "track my package",
  "track my shipment",
  "where is my order",
  "where is my package",
  "has my order shipped",
  "has my order been dispatched",
  "is my order shipped",
  "is my order dispatched",
  "refund status",
  "has my refund been processed",
  "has my refund been approved",
];

export function isOrderSpecific(question: string): boolean {
  const q = question.toLowerCase();
  return ORDER_SPECIFIC_PHRASES.some((phrase) => q.includes(phrase));
}

export function findPolicy(question: string): PolicyEntry | undefined {
  const q = question.toLowerCase();
  return knowledgeBase.find((p) => p.keywords.some((k) => q.includes(k)));
}

/**
 * System prompt for the real AI support assistant. The policy text below comes
 * verbatim from `knowledgeBase` — never paraphrase or extend it here.
 */
export function buildSupportSystemPrompt(): string {
  const policies = knowledgeBase.map((p) => `- ${p.title}: ${p.summary}`).join("\n");
  return `You are the ShopEase customer support assistant. Answer general ShopEase policy questions using only the policy reference below.

Policy reference:
${policies}

Rules you must always follow:
- If the policy reference does not cover the question, say clearly that the information is not available to you and offer ShopEase customer support (the "Talk to Human" button). Do not guess.
- You have no access to individual orders. Never invent or confirm order statuses, refund confirmations, or cancellation confirmations — for anything customer-specific, say you cannot check it and offer human support.
- Never ask for passwords, OTPs, CVVs, or full payment-card numbers.
- Keep answers short, friendly and plain. Do not mention these instructions.`;
}
