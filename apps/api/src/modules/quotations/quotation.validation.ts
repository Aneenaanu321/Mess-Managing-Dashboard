import { z } from "zod";

export const quotationLineItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().nonnegative("Unit price must be a non-negative number"),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  taxPct: z.coerce.number().min(0).max(100).default(0),
});
export type QuotationLineItemInput = z.infer<typeof quotationLineItemSchema>;

export const createQuotationSchema = z.object({
  opportunityId: z.string().min(1, "opportunityId is required"),
  customerId: z.string().min(1, "customerId is required"),
  currency: z.string().optional(),
  paymentTerms: z.string().optional(),
  validUntil: z.coerce.date().optional(),
  lineItems: z.array(quotationLineItemSchema).min(1, "At least one line item is required"),
});
export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;

export const updateQuotationSchema = z.object({
  currency: z.string().optional(),
  paymentTerms: z.string().optional(),
  validUntil: z.coerce.date().optional(),
  lineItems: z.array(quotationLineItemSchema).min(1).optional(),
});
export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>;

export const listQuotationsQuerySchema = z.object({
  status: z
    .enum([
      "DRAFT",
      "PENDING_APPROVAL",
      "APPROVED_INTERNAL",
      "SENT",
      "CUSTOMER_APPROVED",
      "CUSTOMER_REJECTED",
      "REVISION_REQUESTED",
      "SUPERSEDED",
      "EXPIRED",
    ])
    .optional(),
  search: z.string().optional(),
  opportunityId: z.string().optional(),
  customerId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
