export type PolicyTopic = "shipping" | "returns" | "refunds" | "payments" | "cancellations";

export interface PolicyEntry {
  topic: PolicyTopic;
  title: string;
  keywords: string[];
  summary: string;
  note?: string;
}

export interface FAQEntry {
  id: string;
  question: string;
  policyTopic: PolicyTopic;
  answer: string;
}