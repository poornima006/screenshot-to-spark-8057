import { findPolicy, isOrderSpecific } from "./knowledge-base";

/**
 * Used when no policy covers the question. Never guesses: it says the information
 * is unavailable and points at customer support.
 */
export const INFORMATION_UNAVAILABLE_MESSAGE =
  "I'm sorry, that information isn't available to me yet, so I don't want to guess. ShopEase customer support can help — use the Talk to Human button above. I can also answer general questions about shipping, returns, refunds, payments and cancellations.";

/** Used for questions about a specific order or refund; the demo has no order data. */
export const ORDER_SPECIFIC_MESSAGE =
  "I can't look up individual orders in this demo, so I can't confirm your order status or a refund for you. ShopEase customer support can check that — use the Talk to Human button above.";

/** Temporary demo responder. Swap for a real AI call later; keep the same signature. */
export async function getDemoResponse(question: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 600));

  if (isOrderSpecific(question)) return ORDER_SPECIFIC_MESSAGE;

  const policy = findPolicy(question);
  if (policy) return policy.note ? `${policy.title}: ${policy.summary} ${policy.note}` : `${policy.title}: ${policy.summary}`;

  return INFORMATION_UNAVAILABLE_MESSAGE;
}

export const HUMAN_HANDOFF_MESSAGE =
  "Human support isn't connected yet — live agent handoff will be added in a later step. In the meantime, I can help with general policy questions.";
