import type { PolicyEntry } from "./types";

export const cancellationPolicy: PolicyEntry = {
  topic: "cancellations",
  title: "Cancellation Policy",
  keywords: ["cancel", "cancellation", "cancelled", "cancel my order"],
  summary: "Customers can request cancellation before dispatch. Orders already dispatched may not be eligible.",
  note: "We can't check or cancel a specific order here — ShopEase customer support can help with that.",
};