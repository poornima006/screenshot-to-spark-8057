import type { ChatMessage } from "@/components/support/MessageBubble";
import type { PolicySource } from "./rag-answer";

export const EVALUATION_SOURCES = [
  { id: "shipping", title: "Shipping" },
  { id: "returns", title: "Returns" },
  { id: "refunds", title: "Refunds" },
  { id: "payments", title: "Payments" },
  { id: "cancellations", title: "Cancellation" },
  { id: "faqs", title: "FAQs" },
] as const;

export type ActivityResult = "Policy-grounded" | "Unanswered" | "Escalated" | "Assistant unavailable" | "Pending";
export interface EvaluationActivity {
  id: string;
  question: string;
  time: string;
  retrievedSources: PolicySource[] | null;
  usedSources: PolicySource[];
  result: ActivityResult;
}

/** Only explicit response links and verified source IDs count; no text-based guesses. */
export function calculateEvaluation(messages: ChatMessage[]) {
  const activities: EvaluationActivity[] = messages.filter((message) => message.role === "customer").map((question) => {
    const answer = messages.find((message) => message.role === "assistant" && message.inReplyTo === question.id);
    const handoff = messages.some((message) => message.role === "system" && message.inReplyTo === question.id);
    const usedSources = answer?.sources ?? [];
    const result: ActivityResult = handoff ? "Escalated"
      : !answer ? "Pending"
      : usedSources.length ? "Policy-grounded"
      : answer.assistantUnavailable ? "Assistant unavailable" : "Unanswered";
    return { id: question.id, question: question.text, time: question.time,
      retrievedSources: answer?.retrievedSources ?? null, usedSources, result };
  });
  const total = activities.length;
  const grounded = activities.filter((activity) => activity.usedSources.length > 0).length;
  const unansweredOrEscalated = activities.filter((activity) => ["Unanswered", "Escalated", "Assistant unavailable"].includes(activity.result)).length;
  const pending = activities.filter((activity) => activity.result === "Pending").length;
  const sourceUsage = EVALUATION_SOURCES.map((source) => ({ ...source,
    count: activities.filter((activity) => activity.usedSources.some((used) => used.id === source.id)).length,
  })).sort((a, b) => b.count - a.count);
  return { total, grounded, unansweredOrEscalated, pending, groundedPercentage: total ? grounded / total * 100 : 0,
    sourceUsage, activities: [...activities].reverse() };
}