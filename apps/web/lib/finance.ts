"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { toast } from "./toast";

export type InvoiceStatus = "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
export type PaymentMethod = "BANK_TRANSFER" | "CHEQUE" | "CASH" | "CARD" | "ONLINE";

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxPct: string;
  lineTotal: string;
}

export interface Payment {
  id: string;
  amount: string;
  currency: string;
  method: PaymentMethod;
  reference: string | null;
  receivedAt: string;
}

export interface Invoice {
  id: string;
  code: string;
  status: InvoiceStatus;
  currency: string;
  subtotal: string;
  taxTotal: string;
  totalAmount: string;
  amountPaid: string;
  dueDate: string;
  issuedAt: string | null;
  milestoneLabel: string | null;
  customer: { id: string; code: string; name: string };
  project: { id: string; code: string; name: string } | null;
  lineItems?: InvoiceLineItem[];
  payments?: Payment[];
  createdAt: string;
}

export interface CreateInvoiceLineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  taxPct?: number;
}

export interface CreateInvoiceInput {
  customerId: string;
  salesOrderId?: string;
  projectId?: string;
  milestoneLabel?: string;
  currency?: string;
  dueDate: string;
  lineItems: CreateInvoiceLineItemInput[];
}

export interface RecordPaymentInput {
  amount: number;
  method: PaymentMethod;
  reference?: string;
  receivedAt?: string;
}

export const INVOICE_STATUSES: InvoiceStatus[] = ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"];
export const PAYMENT_METHODS: PaymentMethod[] = ["BANK_TRANSFER", "CHEQUE", "CASH", "CARD", "ONLINE"];

export const INVOICE_STATUS_TONE: Record<InvoiceStatus, "slate" | "green" | "amber" | "red" | "blue"> = {
  DRAFT: "slate",
  SENT: "blue",
  PARTIALLY_PAID: "amber",
  PAID: "green",
  OVERDUE: "red",
  CANCELLED: "slate",
};

export function useInvoices(params: { status?: string; customerId?: string; search?: string; page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.customerId) query.set("customerId", params.customerId);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));

  return useQuery({
    queryKey: ["invoices", params],
    queryFn: async () => apiClient.get<Invoice[]>(`/finance?${query.toString()}`),
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ["invoices", id],
    queryFn: async () => (await apiClient.get<Invoice>(`/finance/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateInvoiceInput) => (await apiClient.post<Invoice>("/finance", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Saved");
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, input }: { invoiceId: string; input: RecordPaymentInput }) =>
      (await apiClient.post<{ invoice: Invoice; payment: Payment }>(`/finance/${invoiceId}/payments`, input)).data,
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices", vars.invoiceId] });
    },
  });
}
