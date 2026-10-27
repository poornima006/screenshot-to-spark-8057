import { shippingPolicy } from "./shipping-policy";
import { returnPolicy } from "./return-policy";
import { refundPolicy } from "./refund-policy";
import { paymentInformation } from "./payment-information";
import { cancellationPolicy } from "./cancellation-policy";
import type { FAQEntry } from "./types";

/** Answers reference the policy records so wording is never maintained twice. */
export const frequentlyAskedQuestions: FAQEntry[] = [
  { id: "shipping-time", question: "What is your shipping policy?", policyTopic: "shipping", answer: shippingPolicy.summary },
  { id: "return-eligibility", question: "How can I return a product?", policyTopic: "returns", answer: returnPolicy.summary },
  { id: "refund-time", question: "When will I receive my refund?", policyTopic: "refunds", answer: refundPolicy.summary },
  { id: "payment-methods", question: "Which payment methods do you accept?", policyTopic: "payments", answer: paymentInformation.summary },
  { id: "cancel-order", question: "Can I cancel my order?", policyTopic: "cancellations", answer: cancellationPolicy.summary },
];