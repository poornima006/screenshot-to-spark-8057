import { findPolicy } from "./knowledge-base";

/** Temporary demo responder. Swap for a real AI call later; keep the same signature. */
export async function getDemoResponse(question: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 600));
  const policy = findPolicy(question);
  if (policy) return `${policy.title}: ${policy.summary}`;
  return "I'm a demo assistant and can only answer general questions about shipping, returns, refunds, payments and cancellations right now. Try one of the suggested questions!";
}

export const HUMAN_HANDOFF_MESSAGE =
  "Human support isn't connected yet — live agent handoff will be added in a later step. In the meantime, I can help with general policy questions.";
