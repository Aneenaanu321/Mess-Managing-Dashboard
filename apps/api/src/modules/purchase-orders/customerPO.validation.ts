import { z } from "zod";

export const customerPOStatusEnum = z.enum(["RECEIVED", "VERIFIED", "DISPUTED", "CANCELLED"]);

export const createCustomerPOSchema = z.object({
  poNumber: z.string().min(1, "PO number is required"),
  customerId: z.string().min(1, "customerId is required"),
  quotationId: z.string().min(1, "quotationId is required"),
  amount: z.coerce.number().positive("amount must be greater than 0"),
  currency: z.string().min(1).optional(),
  opportunityId: z.string().optional(),
  advanceRequired: z.coerce.number().min(0).optional(),
});
export type CreateCustomerPOInput = z.infer<typeof createCustomerPOSchema>;

export const listCustomerPOsQuerySchema = z.object({
  status: customerPOStatusEnum.optional(),
  customerId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListCustomerPOsQuery = z.infer<typeof listCustomerPOsQuerySchema>;
