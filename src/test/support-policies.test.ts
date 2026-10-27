import { describe, expect, it } from "vitest";
import { getDemoResponse } from "@/lib/support/demo-responder";
import { findPolicy, isOrderSpecific } from "@/lib/support/knowledge-base";

describe("ShopEase demo policies", () => {
  it("answers shipping with 3-5 business days after dispatch", async () => {
    const answer = await getDemoResponse("What is your shipping policy?");
    expect(answer).toContain("Standard delivery usually takes 3–5 business days after dispatch.");
    expect(answer).not.toContain("3–7");
    expect(answer).not.toContain("30 days");
  });

  it("answers returns with 7 days of delivery, never 30 days", async () => {
    const answer = await getDemoResponse("How can I return a product?");
    expect(answer).toContain("returned within 7 days of delivery");
    expect(answer).toContain("return conditions");
    expect(answer).not.toContain("30 days");
  });

  it("answers refunds with 5-7 business days after approval, never 5-10", async () => {
    const answer = await getDemoResponse("When will I receive my refund?");
    expect(answer).toContain("Refunds are processed within 5–7 business days after the return is approved.");
    expect(answer).not.toContain("5–10");
  });

  it("lists exactly UPI, debit cards, credit cards and net banking", async () => {
    const answer = await getDemoResponse("Which payment methods do you accept?");
    expect(answer).toContain("ShopEase accepts UPI, debit cards, credit cards and net banking.");
    expect(answer).not.toMatch(/cash on delivery|COD|wallet/i);
  });

  it("answers cancellation with the before-dispatch rule", async () => {
    const answer = await getDemoResponse("Can I cancel my order?");
    expect(answer).toContain("Customers can request cancellation before dispatch.");
    expect(answer).toContain("Orders already dispatched may not be eligible.");
  });

  it("says the information is unavailable and offers support when nothing matches", async () => {
    const answer = await getDemoResponse("Do you offer gift wrapping?");
    expect(answer).toContain("isn't available");
    expect(answer).toContain("customer support");
    expect(findPolicy("Do you offer gift wrapping?")).toBeUndefined();
  });

  it("never invents an order status or refund confirmation", async () => {
    const answer = await getDemoResponse("What is the status of my order?");
    expect(isOrderSpecific("What is the status of my order?")).toBe(true);
    expect(answer).toContain("can't look up individual orders");
    expect(answer).not.toMatch(/your order has been|is shipped|is delivered|has been refunded|is approved/i);
  });
});
