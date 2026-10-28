import { buildSupportSystemPrompt } from "./knowledge-base";
import { INFORMATION_UNAVAILABLE_MESSAGE, ORDER_SPECIFIC_MESSAGE } from "./demo-responder";
import { groundAnswer, type GroundedAnswer } from "./rag-answer";
import { needsHumanSupport, retrievePolicySections } from "./retrieval";

export interface SupportTurn { role: "customer" | "assistant"; text: string }
export interface RetrievalRequest { instructions: string; messages: SupportTurn[] }

/** Injection keeps the real pre-generation workflow testable without paid AI calls. */
export async function answerWithRetrieval(
  messages: SupportTurn[],
  generate: (request: RetrievalRequest) => Promise<unknown>,
): Promise<GroundedAnswer> {
  const latest = messages.at(-1);
  if (!latest || latest.role !== "customer") return { reply: INFORMATION_UNAVAILABLE_MESSAGE, sources: [] };
  if (needsHumanSupport(latest.text)) return { reply: ORDER_SPECIFIC_MESSAGE, sources: [] };
  const retrieved = retrievePolicySections(latest.text);
  if (!retrieved.length) return { reply: INFORMATION_UNAVAILABLE_MESSAGE, sources: [] };
  const selection = await generate({ instructions: buildSupportSystemPrompt(retrieved), messages });
  return groundAnswer(selection, retrieved);
}