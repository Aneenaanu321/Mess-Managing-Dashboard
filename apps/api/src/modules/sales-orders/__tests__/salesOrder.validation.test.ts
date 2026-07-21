import { describe, it, expect } from "vitest";
import { allocateSalesOrderSchema, listSalesOrdersQuerySchema } from "../salesOrder.validation";

describe("allocateSalesOrderSchema", () => {
  it("requires a warehouseId", () => {
    expect(allocateSalesOrderSchema.safeParse({}).success).toBe(false);
    expect(allocateSalesOrderSchema.safeParse({ warehouseId: "" }).success).toBe(false);
    expect(allocateSalesOrderSchema.safeParse({ warehouseId: "wh_1" }).success).toBe(true);
  });
});

describe("listSalesOrdersQuerySchema", () => {
  it("defaults page and pageSize", () => {
    const result = listSalesOrdersQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
  });

  it("rejects an unknown status", () => {
    expect(listSalesOrdersQuerySchema.safeParse({ status: "SHIPPED" }).success).toBe(false);
  });

  it("caps pageSize at 100", () => {
    expect(listSalesOrdersQuerySchema.safeParse({ pageSize: 500 }).success).toBe(false);
  });
});
