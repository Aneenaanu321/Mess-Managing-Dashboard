import { describe, it, expect } from "vitest";
import { createLeadSchema } from "../lead.validation";

const base = {
  companyName: "Acme Retail",
  contactName: "Jane Doe",
  source: "REFERRAL" as const,
  industry: "RETAIL" as const,
};

describe("createLeadSchema", () => {
  it("accepts a lead with only an email", () => {
    const result = createLeadSchema.safeParse({ ...base, email: "jane@acme.com" });
    expect(result.success).toBe(true);
  });

  it("accepts a lead with only a phone", () => {
    const result = createLeadSchema.safeParse({ ...base, phone: "+971501234567" });
    expect(result.success).toBe(true);
  });

  it("rejects a lead with neither email nor phone", () => {
    const result = createLeadSchema.safeParse({ ...base });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email format", () => {
    const result = createLeadSchema.safeParse({ ...base, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown lead source", () => {
    const result = createLeadSchema.safeParse({ ...base, email: "jane@acme.com", source: "CARRIER_PIGEON" });
    expect(result.success).toBe(false);
  });

  it("requires companyName and contactName", () => {
    const result = createLeadSchema.safeParse({ ...base, companyName: "", email: "jane@acme.com" });
    expect(result.success).toBe(false);
  });
});
