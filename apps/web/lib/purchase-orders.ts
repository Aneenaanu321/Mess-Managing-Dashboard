"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { toast } from "./toast";

export interface CustomerPO {
  id: string;
  code: string;
  poNumber: string;
  amount: string;
  currency: string;
  status: "RECEIVED" | "VERIFIED" | "DISPUTED" | "CANCELLED";
  amountMismatch: boolean;
  advanceRequired: string;
  advanceReceivedAt: string | null;
  receivedAt: string;
  createdAt: string;
  customer: { id: string; code: string; name: string };
  quotation: { id: string; code: string; grandTotal: string; currency: string; status: string };
  opportunity: { id: string; code: string; title: string } | null;
  salesOrder?: { id: string; code: string; status: string } | null;
}

export interface CreateCustomerPOInput {
  poNumber: string;
  customerId: string;
  quotationId: string;
  amount: number;
  currency?: string;
  opportunityId?: string;
  advanceRequired?: number;
}

export function useCustomerPOs(params: { status?: string; search?: string; page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));

  return useQuery({
    queryKey: ["customer-pos", params],
    queryFn: async () => apiClient.get<CustomerPO[]>(`/purchase-orders?${query.toString()}`),
  });
}

export function useCustomerPO(id: string) {
  return useQuery({
    queryKey: ["customer-pos", id],
    queryFn: async () => (await apiClient.get<CustomerPO>(`/purchase-orders/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateCustomerPO() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCustomerPOInput) => (await apiClient.post<CustomerPO>("/purchase-orders", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-pos"] });
      toast.success("Saved");
    },
  });
}

export function useVerifyCustomerPO(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await apiClient.post<CustomerPO>(`/purchase-orders/${id}/verify`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-pos"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
    },
  });
}

export function useRecordAdvancePayment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await apiClient.post<CustomerPO>(`/purchase-orders/${id}/record-advance`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-pos"] });
      toast.success("Saved");
    },
  });
}

export const CUSTOMER_PO_STATUS_TONE: Record<CustomerPO["status"], "slate" | "green" | "amber" | "red" | "blue"> = {
  RECEIVED: "blue",
  VERIFIED: "green",
  DISPUTED: "red",
  CANCELLED: "slate",
};

/** Lightweight lookups used to populate the New Purchase Order form's customer/quotation pickers. */
export interface CustomerLite {
  id: string;
  code: string;
  name: string;
}

export function useCustomersLite(search?: string) {
  const query = new URLSearchParams({ pageSize: "100" });
  if (search) query.set("search", search);
  return useQuery({
    queryKey: ["customers-lite", search],
    queryFn: async () => (await apiClient.get<CustomerLite[]>(`/customers?${query.toString()}`)).data,
  });
}

export interface QuotationLite {
  id: string;
  code: string;
  customerId: string;
  grandTotal: string;
  currency: string;
  status: string;
}

export function useQuotationsLite(customerId?: string) {
  const query = new URLSearchParams({ pageSize: "100" });
  if (customerId) query.set("customerId", customerId);
  return useQuery({
    queryKey: ["quotations-lite", customerId],
    queryFn: async () => (await apiClient.get<QuotationLite[]>(`/quotations?${query.toString()}`)).data,
  });
}
