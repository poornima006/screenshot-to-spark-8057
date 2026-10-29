import { describe, expect, it } from "vitest";
import { calculateEvaluation } from "@/lib/support/evaluation";
import type { ChatMessage } from "@/components/support/MessageBubble";

const shipping = { id: "shipping", title: "Shipping Policy" };
const refunds = { id: "refunds", title: "Refund Policy" };
const question = (id: string): ChatMessage => ({ id, role: "customer", text: `Question ${id}`, time: "10:00" });
const answer = (id: string, fields: Partial<ChatMessage> = {}): ChatMessage => ({ id: `a-${id}`, role: "assistant", text: "Answer", time: "10:01", inReplyTo: id, sources: [], retrievedSources: [], ...fields });

describe("Session evaluation metrics", () => {
  it("returns zero metrics and six unused sources for an empty conversation", () => {
    const result = calculateEvaluation([]);
    expect(result.total).toBe(0);
    expect(result.grounded).toBe(0);
    expect(result.unansweredOrEscalated).toBe(0);
    expect(result.groundedPercentage).toBe(0);
    expect(result.activities).toEqual([]);
    expect(result.sourceUsage).toHaveLength(6);
    expect(result.sourceUsage.map((source) => source.count)).toEqual([0, 0, 0, 0, 0, 0]);
  });
  it("ignores welcome and unlinked handoff messages", () => {
    expect(calculateEvaluation([{ id: "welcome", role: "assistant", text: "Hi", time: "" },
      { id: "handoff", role: "system", text: "Support", time: "" }]).total).toBe(0);
  });
  it("calculates coverage from real questions and separates pending questions", () => {
    const result = calculateEvaluation([question("1"), answer("1", { sources: [shipping], retrievedSources: [shipping] }),
      question("2"), answer("2"), question("3")]);
    expect(result.total).toBe(3);
    expect(result.grounded).toBe(1);
    expect(result.unansweredOrEscalated).toBe(1);
    expect(result.pending).toBe(1);
    expect(result.groundedPercentage).toBeCloseTo(33.3333);
    expect(result.activities.map((activity) => activity.result)).toEqual(["Pending", "Unanswered", "Policy-grounded"]);
  });
  it("counts only used sources, once per question, and ranks them by usage", () => {
    const result = calculateEvaluation([question("1"), answer("1", { sources: [refunds, refunds], retrievedSources: [shipping, refunds] }),
      question("2"), answer("2", { sources: [shipping, refunds], retrievedSources: [shipping, refunds] })]);
    expect(result.sourceUsage[0]).toEqual({ id: "refunds", title: "Refunds", count: 2 });
    expect(result.sourceUsage.find((source) => source.id === "shipping")?.count).toBe(1);
    expect(result.groundedPercentage).toBe(100);
  });
  it("keeps retrieval separate from grounding when the AI rejects unsupported details", () => {
    const result = calculateEvaluation([question("1"), answer("1", { retrievedSources: [shipping] })]);
    expect(result.grounded).toBe(0);
    expect(result.activities[0]?.retrievedSources).toEqual([shipping]);
    expect(result.activities[0]?.result).toBe("Unanswered");
    expect(result.sourceUsage.every((source) => source.count === 0)).toBe(true);
  });
  it("marks failed AI requests unavailable without guessing retrieval", () => {
    const result = calculateEvaluation([question("1"), answer("1", { assistantUnavailable: true, retrievedSources: null })]);
    expect(result.activities[0]?.result).toBe("Assistant unavailable");
    expect(result.activities[0]?.retrievedSources).toBeNull();
    expect(result.unansweredOrEscalated).toBe(1);
  });
  it("deduplicates handoff requests and never invents a question for them", () => {
    const result = calculateEvaluation([question("1"), answer("1"),
      { id: "h1", role: "system", text: "Support", time: "", inReplyTo: "1" },
      { id: "h2", role: "system", text: "Support", time: "", inReplyTo: "1" }]);
    expect(result.total).toBe(1);
    expect(result.unansweredOrEscalated).toBe(1);
    expect(result.activities[0]?.result).toBe("Escalated");
  });
  it("retains grounded coverage when a grounded answer is also escalated", () => {
    const result = calculateEvaluation([question("1"), answer("1", { sources: [shipping] }),
      { id: "h1", role: "system", text: "Support", time: "", inReplyTo: "1" }]);
    expect(result.grounded).toBe(1);
    expect(result.groundedPercentage).toBe(100);
    expect(result.unansweredOrEscalated).toBe(1);
    expect(result.activities[0]?.result).toBe("Escalated");
  });
  it("does not attach late replies to the wrong question or to cleared conversations", () => {
    const result = calculateEvaluation([question("2"), answer("1", { sources: [shipping] })]);
    expect(result.pending).toBe(1);
    expect(result.grounded).toBe(0);
    expect(calculateEvaluation([answer("1", { sources: [shipping] })]).total).toBe(0);
  });
});