/**
 * ShopEase knowledge base (placeholder policies for the demo).
 * Later this can be replaced by a document store / retrieval step.
 */
export type PolicyTopic = "shipping" | "returns" | "refunds" | "payments" | "cancellations";

export interface PolicyEntry {
  topic: PolicyTopic;
  title: string;
  keywords: string[];
  summary: string;
}

export const knowledgeBase: PolicyEntry[] = [
  {
    topic: "shipping",
    title: "Shipping policy",
    keywords: ["ship", "shipping", "delivery", "deliver", "arrive", "track"],
    summary:
      "Sample policy: standard shipping usually takes 3–7 business days, and express options may be available at checkout. Real ShopEase policy details will be connected in a later step.",
  },
  {
    topic: "returns",
    title: "Returns",
    keywords: ["return", "exchange", "send back"],
    summary:
      "Sample policy: most items can be returned within 30 days in their original condition. You'd start a return from your account's order page once that feature is connected.",
  },
  {
    topic: "refunds",
    title: "Refunds",
    keywords: ["refund", "money back", "reimburse"],
    summary:
      "Sample policy: refunds are typically issued to the original payment method within 5–10 business days after a return is received.",
  },
  {
    topic: "payments",
    title: "Payment methods",
    keywords: ["pay", "payment", "card", "upi", "wallet", "cod"],
    summary:
      "Sample policy: ShopEase would accept major credit/debit cards, UPI, popular wallets and cash on delivery in selected areas.",
  },
  {
    topic: "cancellations",
    title: "Cancellations",
    keywords: ["cancel", "cancellation"],
    summary:
      "Sample policy: orders can usually be cancelled before they ship. I can't look up or cancel real orders in this demo.",
  },
];

export function findPolicy(question: string): PolicyEntry | undefined {
  const q = question.toLowerCase();
  return knowledgeBase.find((p) => p.keywords.some((k) => q.includes(k)));
}
