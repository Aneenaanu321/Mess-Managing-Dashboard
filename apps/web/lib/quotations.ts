"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, getAccessToken } from "./api-client";
import { toast } from "./toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export const QUOTATION_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED_INTERNAL",
  "SENT",
  "CUSTOMER_APPROVED",
  "CUSTOMER_REJECTED",
  "REVISION_REQUESTED",
  "SUPERSEDED",
  "EXPIRED",
] as const;

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const STATUS_TONE: Record<QuotationStatus, "slate" | "green" | "amber" | "red" | "blue"> = {
  DRAFT: "slate",
  PENDING_APPROVAL: "amber",
  APPROVED_INTERNAL: "blue",
  SENT: "blue",
  CUSTOMER_APPROVED: "green",
  CUSTOMER_REJECTED: "red",
  REVISION_REQUESTED: "amber",
  SUPERSEDED: "slate",
  EXPIRED: "red",
};

export interface QuotationLineItem {
  id: string;
  productId: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPct: string;
  taxPct: string;
  lineTotal: string;
  sortOrder: number;
}

export interface Quotation {
  id: string;
  code: string;
  version: number;
  status: QuotationStatus;
  currency: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  grandTotal: string;
  paymentTerms: string | null;
  validUntil: string | null;
  sentAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  customer: { id: string; code: string; name: string } | null;
  opportunity: { id: string; code: string; title: string; stage?: string } | null;
  lineItems?: QuotationLineItem[];
}

export interface QuotationLineItemInput {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct?: number;
  taxPct?: number;
}

export interface CreateQuotationInput {
  opportunityId: string;
  customerId: string;
  currency?: string;
  paymentTerms?: string;
  lineItems: QuotationLineItemInput[];
}

export function useQuotations(
  params: { status?: string; search?: string; opportunityId?: string; customerId?: string; page?: number } = {},
) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.opportunityId) query.set("opportunityId", params.opportunityId);
  if (params.customerId) query.set("customerId", params.customerId);
  if (params.page) query.set("page", String(params.page));

  return useQuery({
    queryKey: ["quotations", params],
    queryFn: async () => apiClient.get<Quotation[]>(`/quotations?${query.toString()}`),
  });
}

export function useQuotation(id: string) {
  return useQuery({
    queryKey: ["quotations", id],
    queryFn: async () => (await apiClient.get<Quotation>(`/quotations/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateQuotationInput) => (await apiClient.post<Quotation>("/quotations", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast.success("Saved");
    },
  });
}

export function useSendQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.post<Quotation>(`/quotations/${id}/send`)).data,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["quotations", id] });
    },
  });
}

/** Opens the branded PDF in a new tab. A plain <a href> can't carry our
 * Bearer token, so this fetches the PDF as a blob (with auth) and opens
 * that instead — same pattern as file attachment downloads. */
export async function openQuotationPdf(id: string, code: string) {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/quotations/${id}/pdf`, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error("Failed to generate PDF");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    // Popup blocked — fall back to a direct download instead.
    const a = document.createElement("a");
    a.href = url;
    a.download = `${code}.pdf`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function useApproveQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.post<Quotation>(`/quotations/${id}/approve`)).data,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["quotations", id] });
    },
  });
}
