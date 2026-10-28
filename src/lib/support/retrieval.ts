import { frequentlyAskedQuestions, knowledgeBase, isOrderSpecific } from "./knowledge-base";
import type { PolicyTopic } from "./knowledge/types";

export interface RetrievedSection {
  id: string;
  title: string;
  summary: string;
  note?: string;
  score: number;
}

const aliases: Record<PolicyTopic, string[]> = {
  shipping: ["shipped", "shipment", "deliveries", "arrive", "arrival"],
  returns: ["returned", "returning", "exchanges"],
  refunds: ["refunded", "reimbursement"],
  payments: ["accepted", "methods", "card", "cards", "cod", "wallet", "cash on delivery"],
  cancellations: ["cancelling", "canceling", "canceled", "cancellations"],
};

export function normalizeQuery(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function containsPhrase(query: string, phrase: string): boolean {
  return ` ${query} `.includes(` ${normalizeQuery(phrase)} `);
}

/** A public policy reference cannot answer individual status or action requests. */
export function needsHumanSupport(question: string): boolean {
  const q = normalizeQuery(question);
  return isOrderSpecific(q)
    || /\b(track|tracking|status|where is|where s)\b.*\b(order|package|parcel|shipment|refund)\b/.test(q)
    || /\b(order|package|parcel|shipment|refund)\b.*\b(status|tracking|arrived|shipped|dispatched|approved|processed|delivered)\b/.test(q) && /\b(my|mine|has|is|was|did)\b/.test(q)
    || /\b(has|have|did|was|is)\b.*\b(my|mine)\b.*\b(refund|order|package|parcel|shipment)\b/.test(q)
    || /\b(cancel|refund|return)\b.*\b(order|payment)\s*\d+\b/.test(q)
    || /\b(please|now|immediately)\b.*\b(cancel|refund)\b/.test(q);
}

/** Ranked, whole-word keyword/phrase search over bundled policy and FAQ records.
 * No filesystem access, embedding service, or semantic search is involved.
 * FAQ question matches boost the underlying policy, avoiding duplicate facts.
 */
export function retrievePolicySections(question: string): RetrievedSection[] {
  if (needsHumanSupport(question)) return [];
  const query = normalizeQuery(question);
  if (!query) return [];
  const matches = knowledgeBase.map((policy): RetrievedSection => {
    const terms = [...new Set([...policy.keywords, ...aliases[policy.topic]])];
    let score = terms.reduce((total, term) => total + (containsPhrase(query, term) ? 10 : 0), 0);
    const faqs = frequentlyAskedQuestions.filter((faq) => faq.policyTopic === policy.topic);
    if (faqs.some((faq) => normalizeQuery(faq.question) === query)) score += 20;
    return { id: policy.topic, title: policy.title, summary: policy.summary, ...(policy.note ? { note: policy.note } : {}), score };
  }).filter((section) => section.score > 0);

  if (/\b(faq|faqs|frequently asked questions)\b/.test(query)) {
    matches.push({
      id: "faqs", title: "Frequently Asked Questions", score: 30,
      summary: frequentlyAskedQuestions.map((faq) => `${faq.question}\n${faq.answer}`).join("\n\n"),
    });
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, 3);
}