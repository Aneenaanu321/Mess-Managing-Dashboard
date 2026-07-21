import { describe, it, expect } from "vitest";
import { createCustomerPOSchema } from "../customerPO.validation";

const base = {
  poNumber: "PO-2026-001",
  customerId: "cust_1",
  quotationId: "quote_1",
  amount: 16548,
};

describe("createCustomerPOSchema", () => {
  it("accepts a well-formed PO", () => {
    expect(createCustomerPOSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a zero or negative amount", () => {
    expect(createCustomerPOSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(createCustomerPOSchema.safeParse({ ...base, amount: -100 }).success).toBe(false);
  });

  it("rejects a missing poNumber", () => {
    expect(createCustomerPOSchema.safeParse({ ...base, poNumber: "" }).success).toBe(false);
  });

  it("coerces a numeric string amount", () => {
    const result = createCustomerPOSchema.safeParse({ ...base, amount: "16548" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.amount).toBe(16548);
  });

  it("rejects a negative advanceRequired", () => {
    expect(createCustomerPOSchema.safeParse({ ...base, advanceRequired: -1 }).success).toBe(false);
  });
});
