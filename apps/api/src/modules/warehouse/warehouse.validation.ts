import { z } from "zod";

export const listStockQuerySchema = z.object({
  warehouseId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(100),
});
export type ListStockQuery = z.infer<typeof listStockQuerySchema>;

export const adjustStockSchema = z.object({
  warehouseId: z.string().min(1, "warehouseId is required"),
  productId: z.string().min(1, "productId is required"),
  quantityDelta: z.coerce.number().refine((v) => v !== 0, "quantityDelta must not be zero"),
  reason: z.string().min(1, "reason is required"),
});
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
