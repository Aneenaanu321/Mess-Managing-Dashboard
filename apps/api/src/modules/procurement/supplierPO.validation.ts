import { z } from "zod";

export const supplierPOStatusEnum = z.enum(["DRAFT", "SENT", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"]);

export const supplierPOLineItemSchema = z.object({
  productId: z.string().min(1, "productId is required"),
  quantity: z.coerce.number().positive("quantity must be greater than 0"),
  unitCost: z.coerce.number().nonnegative("unitCost must be a non-negative number"),
});

export const createSupplierPOSchema = z.object({
  vendorId: z.string().min(1, "vendorId is required"),
  currency: z.string().min(1).optional(),
  expectedDate: z.string().datetime().optional().or(z.literal("")),
  lineItems: z.array(supplierPOLineItemSchema).min(1, "At least one line item is required"),
});
export type CreateSupplierPOInput = z.infer<typeof createSupplierPOSchema>;

export const listSupplierPOsQuerySchema = z.object({
  status: supplierPOStatusEnum.optional(),
  vendorId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListSupplierPOsQuery = z.infer<typeof listSupplierPOsQuerySchema>;
