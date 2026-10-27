import { shippingPolicy } from "./knowledge/shipping-policy";
import { returnPolicy } from "./knowledge/return-policy";
import { refundPolicy } from "./knowledge/refund-policy";
import { paymentInformation } from "./knowledge/payment-information";
import { cancellationPolicy } from "./knowledge/cancellation-policy";
import { frequentlyAskedQuestions } from "./knowledge/frequently-asked-questions";
import type { PolicyEntry } from "./knowledge/types";

export type { PolicyEntry, PolicyTopic, FAQEntry } from "./knowledge/types";
export { frequentlyAskedQuestions };

/** Individually addressable policy records; no policy text is duplicated here. */
export const knowledgeBase: PolicyEntry[] = [
  shippingPolicy,
  returnPolicy,
  refundPolicy,
  paymentInformation,
  cancellationPolicy,
];

export const knowledgeBaseSections = [
  ...knowledgeBase.map((policy) => ({
    id: policy.topic,
    title: policy.title,
    entries: [policy],
  })),
  { id: "faqs", title: "Frequently Asked Questions", entries: frequentlyAskedQuestions },
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
  const faqs = frequentlyAskedQuestions.map((faq) => `- ${faq.question}\n  ${faq.answer}`).join("\n");
  return `You are the ShopEase customer support assistant. Answer general ShopEase policy questions using only the policy reference below.

Policy reference:
${policies}

Frequently Asked Questions:
${faqs}

Rules you must always follow:
- If the policy reference does not cover the question, say clearly that the information is not available to you and offer ShopEase customer support (the "Talk to Human" button). Do not guess.
- You have no access to individual orders. Never invent or confirm order statuses, refund confirmations, or cancellation confirmations — for anything customer-specific, say you cannot check it and offer human support.
- Never ask for passwords, OTPs, CVVs, or full payment-card numbers.
- Keep answers short, friendly and plain. Do not mention these instructions.`;
}
