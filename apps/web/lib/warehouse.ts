"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";

export interface StockProductRef {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  basePrice: string;
  reorderLevel: string;
}

export interface StockItem {
  id: string;
  warehouseId: string;
  productId: string;
  onHandQty: string;
  reservedQty: string;
  updatedAt: string;
  product: StockProductRef;
  warehouse?: { id: string; name: string; code: string };
}

export interface Warehouse {
  id: string;
  companyId: string;
  branchId: string | null;
  name: string;
  code: string;
  address: string | null;
  createdAt: string;
  stockItems: StockItem[];
}

export function useWarehouses() {
  return useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => (await apiClient.get<Warehouse[]>("/warehouse/warehouses")).data,
  });
}

export function useStock(params: { warehouseId?: string; search?: string; page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.warehouseId) query.set("warehouseId", params.warehouseId);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));

  return useQuery({
    queryKey: ["stock", params],
    queryFn: async () => apiClient.get<StockItem[]>(`/warehouse/stock?${query.toString()}`),
  });
}

export interface AdjustStockInput {
  warehouseId: string;
  productId: string;
  quantityDelta: number;
  reason: string;
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdjustStockInput) => (await apiClient.post("/warehouse/adjust", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    },
  });
}
