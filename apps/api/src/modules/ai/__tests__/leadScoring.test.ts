import { describe, it, expect } from "vitest";
import { scoreLead } from "../leadScoring";

describe("scoreLead", () => {
  it("scores a referral retail lead with full contact info highly", () => {
    const score = scoreLead({
      source: "REFERRAL",
      industry: "RETAIL",
      email: "buyer@retailco.com",
      phone: "+971501234567",
      contactName: "Jane Doe",
      companyName: "Retail Co",
    });
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it("scores a cold-call lead with missing contact info lower", () => {
    const score = scoreLead({
      source: "COLD_CALL",
      industry: "OTHER",
      contactName: "X",
      companyName: "Y",
    });
    expect(score).toBeLessThan(40);
  });

  it("always returns a value clamped between 0 and 100", () => {
    const score = scoreLead({
      source: "REFERRAL",
      industry: "RETAIL",
      email: "a@b.com",
      phone: "123",
      contactName: "Full Name",
      companyName: "Company",
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
