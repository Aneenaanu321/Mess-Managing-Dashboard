"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";

export interface Vendor {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  leadTimeDays: number | null;
  createdAt: string;
}

export interface CreateVendorInput {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  leadTimeDays?: number;
}

export function useVendors(search?: string) {
  const query = new URLSearchParams();
  if (search) query.set("search", search);
  return useQuery({
    queryKey: ["vendors", search],
    queryFn: async () => apiClient.get<Vendor[]>(`/procurement/vendors?${query.toString()}`),
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVendorInput) => (await apiClient.post<Vendor>("/procurement/vendors", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendors"] }),
  });
}

export type SupplierPOStatus = "DRAFT" | "SENT" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";

export interface SupplierPOLineItem {
  id: string;
  productId: string;
  quantity: string;
  unitCost: string;
  receivedQty: string;
  product: { id: string; sku: string; name: string; unit: string };
}

export interface SupplierPO {
  id: string;
  code: string;
  vendorId: string;
  status: SupplierPOStatus;
  currency: string;
  totalAmount: string;
  expectedDate: string | null;
  createdAt: string;
  updatedAt: string;
  vendor: { id: string; name: string; contactName: string | null; email: string | null; phone: string | null };
  lineItems?: SupplierPOLineItem[];
}

export interface CreateSupplierPOLineItemInput {
  productId: string;
  quantity: number;
  unitCost: number;
}

export interface CreateSupplierPOInput {
  vendorId: string;
  currency?: string;
  expectedDate?: string;
  lineItems: CreateSupplierPOLineItemInput[];
}

export function useSupplierPOs(params: { status?: string; vendorId?: string; search?: string; page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.vendorId) query.set("vendorId", params.vendorId);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));

  return useQuery({
    queryKey: ["supplier-pos", params],
    queryFn: async () => apiClient.get<SupplierPO[]>(`/procurement?${query.toString()}`),
  });
}

export function useSupplierPO(id: string) {
  return useQuery({
    queryKey: ["supplier-pos", id],
    queryFn: async () => (await apiClient.get<SupplierPO>(`/procurement/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateSupplierPO() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSupplierPOInput) => (await apiClient.post<SupplierPO>("/procurement", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supplier-pos"] }),
  });
}

export const SUPPLIER_PO_STATUS_TONE: Record<SupplierPOStatus, "slate" | "green" | "amber" | "red" | "blue"> = {
  DRAFT: "slate",
  SENT: "blue",
  PARTIALLY_RECEIVED: "amber",
  RECEIVED: "green",
  CANCELLED: "red",
};
