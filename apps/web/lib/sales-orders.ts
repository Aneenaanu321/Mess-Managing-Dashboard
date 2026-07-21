"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";

export type SalesOrderStatus = "PENDING_ALLOCATION" | "PARTIALLY_ALLOCATED" | "ALLOCATED" | "FULFILLED" | "CANCELLED";

export interface SalesOrderLineItem {
  id: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  product: { id: string; sku: string; name: string; unit: string };
  allocations: { id: string; warehouseId: string; quantity: string; status: string }[];
}

export interface SalesOrder {
  id: string;
  code: string;
  status: SalesOrderStatus;
  currency: string;
  totalAmount: string;
  createdAt: string;
  customer: { id: string; code: string; name: string };
  customerPO: { id: string; code: string; poNumber?: string };
  lineItems: SalesOrderLineItem[];
  project: { id: string; code: string; status: string } | null;
}

export function useSalesOrders(params: { status?: string; search?: string; page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));

  return useQuery({
    queryKey: ["sales-orders", params],
    queryFn: async () => apiClient.get<SalesOrder[]>(`/sales-orders?${query.toString()}`),
  });
}

export function useSalesOrder(id: string) {
  return useQuery({
    queryKey: ["sales-orders", id],
    queryFn: async () => (await apiClient.get<SalesOrder>(`/sales-orders/${id}`)).data,
    enabled: !!id,
  });
}

export function useAllocateSalesOrder(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (warehouseId: string) => (await apiClient.post<SalesOrder>(`/sales-orders/${id}/allocate`, { warehouseId })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
    },
  });
}

export const SALES_ORDER_STATUS_TONE: Record<SalesOrderStatus, "slate" | "green" | "amber" | "red" | "blue"> = {
  PENDING_ALLOCATION: "slate",
  PARTIALLY_ALLOCATED: "amber",
  ALLOCATED: "blue",
  FULFILLED: "green",
  CANCELLED: "red",
};
