import { describe, expect, it, vi } from "vitest";
import { retrievePolicySections, needsHumanSupport } from "@/lib/support/retrieval";
import { groundAnswer } from "@/lib/support/rag-answer";
import { answerWithRetrieval, type RetrievalRequest } from "@/lib/support/rag-workflow";
import { buildSupportSystemPrompt } from "@/lib/support/knowledge-base";

describe("Keyword retrieval", () => {
  it.each([
    ["What is your shipping policy?", "shipping"],
    ["How can I return a product?", "returns"],
    ["When will I receive my refund?", "refunds"],
    ["Which payment methods do you accept?", "payments"],
    ["Can I cancel my order?", "cancellations"],
  ])("retrieves the corresponding policy for %s", (question, id) => {
    expect(retrievePolicySections(question).map((section) => section.id)).toEqual([id]);
  });

  it("normalizes punctuation and uses whole words rather than substring guesses", () => {
    expect(retrievePolicySections("NET-BANKING?")[0]?.id).toBe("payments");
    expect(retrievePolicySections("Do you offer membership or sponsorship?")).toEqual([]);
    expect(retrievePolicySections("Do you offer gift wrapping?")).toEqual([]);
  });

  it("retrieves multiple matching topics and searches the separate FAQs", () => {
    expect(retrievePolicySections("Shipping and refunds").map((section) => section.id)).toEqual(["shipping", "refunds"]);
    const faq = retrievePolicySections("Frequently asked questions");
    expect(faq.map((section) => section.id)).toEqual(["faqs"]);
    expect(faq[0]?.summary).toContain("returned within 7 days of delivery");
  });

  it.each([
    "Where is my order?", "Has my refund been approved?", "Track my parcel",
    "Was my package shipped?", "Please cancel my order now", "Refund order 12345",
  ])("blocks individual status/action requests: %s", (question) => {
    expect(needsHumanSupport(question)).toBe(true);
    expect(retrievePolicySections(question)).toEqual([]);
  });
});

describe("Actual pre-generation workflow", () => {
  it("retrieves before generation and supplies only matching records", async () => {
    const generate = vi.fn(async (request: RetrievalRequest) => {
      expect(request.instructions).toContain("[refunds] Refund Policy");
      expect(request.instructions).toContain("Refunds are processed within 5–7 business days after the return is approved.");
      expect(request.instructions).not.toContain("Standard delivery usually takes");
      expect(request.instructions).not.toContain("ShopEase accepts UPI");
      return { sourceIds: ["refunds"], unavailable: false };
    });
    const answer = await answerWithRetrieval([{ role: "customer", text: "When will I receive my refund?" }], generate);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(answer.sources).toEqual([{ id: "refunds", title: "Refund Policy" }]);
    expect(answer.reply).toContain("5–7 business days after the return is approved");
  });

  it("does not call AI or cite a source for unknown questions, even after a known topic", async () => {
    const generate = vi.fn();
    const answer = await answerWithRetrieval([
      { role: "customer", text: "Shipping policy?" },
      { role: "assistant", text: "Shipping takes 30 days" },
      { role: "customer", text: "Do you offer gift wrapping?" },
    ], generate);
    expect(generate).not.toHaveBeenCalled();
    expect(answer.sources).toEqual([]);
    expect(answer.reply).toContain("isn't available");
    expect(answer.reply).toContain("Talk to Human");
  });

  it("bypasses generation for individual refund statuses", async () => {
    const generate = vi.fn();
    const answer = await answerWithRetrieval([{ role: "customer", text: "Has my refund been approved?" }], generate);
    expect(generate).not.toHaveBeenCalled();
    expect(answer.sources).toEqual([]);
    expect(answer.reply).toContain("can't confirm");
    expect(answer.reply).not.toContain("has been approved");
  });

  it("allows a topic match to be rejected when the requested detail is unsupported", async () => {
    const generate = vi.fn(async () => ({ sourceIds: [], unavailable: true }));
    const answer = await answerWithRetrieval([{ role: "customer", text: "What is the shipping fee to Canada?" }], generate);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(answer.sources).toEqual([]);
    expect(answer.reply).toContain("isn't available");
  });
});

describe("Source attribution and extractive safety", () => {
  it("cites only retrieved records actually selected and used in the answer", () => {
    const sections = retrievePolicySections("Shipping and refunds");
    const answer = groundAnswer({ sourceIds: ["refunds", "refunds"], unavailable: false }, sections);
    expect(answer.sources).toEqual([{ id: "refunds", title: "Refund Policy" }]);
    expect(answer.reply).not.toContain("Standard delivery");
  });

  it.each([
    { sourceIds: ["payments"], unavailable: false },
    { sourceIds: ["refunds", "invented-policy"], unavailable: false },
    { sourceIds: [], unavailable: false },
    { sourceIds: ["refunds"], unavailable: true },
    { sourceIds: ["refunds"], unavailable: false, reply: "Your refund is approved within 5–10 days" },
  ])("fails closed on invalid, unused or fabricated source output: %j", (output) => {
    const answer = groundAnswer(output, retrievePolicySections("Refund policy"));
    expect(answer.sources).toEqual([]);
    expect(answer.reply).toContain("isn't available");
    expect(answer.reply).not.toMatch(/5–10|is approved/);
  });

  it.each([
    ["Shipping policy", "shipping", "Standard delivery usually takes 3–5 business days after dispatch."],
    ["Return policy", "returns", "Eligible products can be returned within 7 days of delivery if they meet the return conditions."],
    ["Refund policy", "refunds", "Refunds are processed within 5–7 business days after the return is approved."],
    ["Payment information", "payments", "ShopEase accepts UPI, debit cards, credit cards and net banking."],
    ["Cancellation policy", "cancellations", "Customers can request cancellation before dispatch. Orders already dispatched may not be eligible."],
  ])("renders the exact safe policy for %s", (question, id, wording) => {
    const answer = groundAnswer({ sourceIds: [id], unavailable: false }, retrievePolicySections(question));
    expect(answer.reply).toContain(wording);
    expect(answer.reply).not.toMatch(/30.day|5[–-]10|3[–-]7|cash on delivery|wallet|your order has been/i);
    expect(answer.sources.map((source) => source.id)).toEqual([id]);
  });

  it("does not put the full knowledge base in a prompt without retrieval", () => {
    const prompt = buildSupportSystemPrompt();
    expect(prompt).not.toContain("Standard delivery usually takes");
    expect(prompt).not.toContain("Refunds are processed within");
    expect(prompt).toContain("untrusted conversation");
    expect(prompt).toContain("Never invent or confirm order statuses");
    expect(prompt).toContain("Never ask for passwords, OTPs, CVVs");
  });
});