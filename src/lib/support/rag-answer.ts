import { z } from "zod";
import { INFORMATION_UNAVAILABLE_MESSAGE } from "./demo-responder";
import type { RetrievedSection } from "./retrieval";

export interface PolicySource { id: string; title: string }
export interface GroundedAnswer { reply: string; sources: PolicySource[] }

export const selectionSchema = z.object({
  sourceIds: z.array(z.string()).max(3),
  unavailable: z.boolean(),
}).strict();

/** Extractive generation: the AI selects supporting records; only trusted source
 * text is rendered. Invented prose/IDs cannot become a customer-facing fact.
 */
export function groundAnswer(output: unknown, retrieved: RetrievedSection[]): GroundedAnswer {
  const selection = selectionSchema.safeParse(output);
  const fallback = { reply: INFORMATION_UNAVAILABLE_MESSAGE, sources: [] };
  if (!selection.success || selection.data.unavailable || selection.data.sourceIds.length === 0) return fallback;
  const ids = [...new Set(selection.data.sourceIds)];
  const used = ids.map((id) => retrieved.find((section) => section.id === id));
  if (used.some((section) => section === undefined)) return fallback;
  const verified = used.filter((section): section is RetrievedSection => section !== undefined);
  return {
    reply: verified.map((section) => [section.summary, section.note].filter(Boolean).join(" ")).join("\n\n"),
    sources: verified.map((section) => ({ id: section.id, title: section.title })),
  };
}