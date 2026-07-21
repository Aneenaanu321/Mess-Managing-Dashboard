import { z } from "zod";

export const invoiceStatusEnum = z.enum(["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"]);
export const paymentMethodEnum = z.enum(["BANK_TRANSFER", "CHEQUE", "CASH", "CARD", "ONLINE"]);

export const invoiceLineItemSchema = z.object({
  description: z.string().min(1, "description is required"),
  quantity: z.coerce.number().positive().default(1),
  unitPrice: z.coerce.number().min(0),
  taxPct: z.coerce.number().min(0).max(100).default(0),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().min(1, "customerId is required"),
  salesOrderId: z.string().optional(),
  projectId: z.string().optional(),
  milestoneLabel: z.string().optional(),
  currency: z.string().optional(),
  dueDate: z.coerce.date(),
  lineItems: z.array(invoiceLineItemSchema).min(1, "At least one line item is required"),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = z.object({
  status: invoiceStatusEnum.optional(),
  dueDate: z.coerce.date().optional(),
  milestoneLabel: z.string().optional(),
  issuedAt: z.coerce.date().optional(),
});
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive("amount must be greater than 0"),
  method: paymentMethodEnum,
  reference: z.string().optional(),
  receivedAt: z.coerce.date().optional(),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const listInvoicesQuerySchema = z.object({
  status: invoiceStatusEnum.optional(),
  customerId: z.string().optional(),
  projectId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
