"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { toast } from "./toast";

export type ProductCategory =
  | "RFID_READER"
  | "RFID_ANTENNA"
  | "RFID_GATE"
  | "RFID_HANDHELD"
  | "RFID_PRINTER"
  | "RFID_TAG"
  | "RFID_LABEL"
  | "RFID_SOFTWARE"
  | "LOSS_PREVENTION"
  | "EAS_SYSTEM"
  | "MARKING_CODING"
  | "BARCODE"
  | "WAREHOUSE_AUTOMATION"
  | "ASSET_TRACKING"
  | "CLOUD_LICENSE"
  | "SERVICE_INSTALLATION"
  | "SERVICE_TRAINING"
  | "SERVICE_AMC"
  | "OTHER";

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  brand: string | null;
  description: string | null;
  unit: string;
  costPrice: string;
  basePrice: string;
  currency: string;
  isSerialized: boolean;
  reorderLevel: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  sku: string;
  name: string;
  category: ProductCategory;
  brand?: string;
  description?: string;
  unit?: string;
  basePrice: number;
  costPrice?: number;
  currency?: string;
  isSerialized?: boolean;
  reorderLevel?: number;
  isActive?: boolean;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export function useProducts(params: { category?: string; search?: string; isActive?: boolean; page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.search) query.set("search", params.search);
  if (params.isActive !== undefined) query.set("isActive", String(params.isActive));
  if (params.page) query.set("page", String(params.page));

  return useQuery({
    queryKey: ["products", params],
    queryFn: async () => apiClient.get<Product[]>(`/inventory/products?${query.toString()}`),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: async () => (await apiClient.get<Product>(`/inventory/products/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProductInput) => (await apiClient.post<Product>("/inventory/products", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Saved");
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateProductInput }) =>
      (await apiClient.patch<Product>(`/inventory/products/${id}`, input)).data,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", variables.id] });
    },
  });
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "RFID_READER",
  "RFID_ANTENNA",
  "RFID_GATE",
  "RFID_HANDHELD",
  "RFID_PRINTER",
  "RFID_TAG",
  "RFID_LABEL",
  "RFID_SOFTWARE",
  "LOSS_PREVENTION",
  "EAS_SYSTEM",
  "MARKING_CODING",
  "BARCODE",
  "WAREHOUSE_AUTOMATION",
  "ASSET_TRACKING",
  "CLOUD_LICENSE",
  "SERVICE_INSTALLATION",
  "SERVICE_TRAINING",
  "SERVICE_AMC",
  "OTHER",
];
