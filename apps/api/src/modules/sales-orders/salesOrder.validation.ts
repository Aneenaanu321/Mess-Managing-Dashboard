import { z } from "zod";

export const salesOrderStatusEnum = z.enum([
  "PENDING_ALLOCATION",
  "PARTIALLY_ALLOCATED",
  "ALLOCATED",
  "FULFILLED",
  "CANCELLED",
]);

export const listSalesOrdersQuerySchema = z.object({
  status: salesOrderStatusEnum.optional(),
  customerId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListSalesOrdersQuery = z.infer<typeof listSalesOrdersQuerySchema>;

export const allocateSalesOrderSchema = z.object({
  warehouseId: z.string().min(1, "warehouseId is required"),
});
export type AllocateSalesOrderInput = z.infer<typeof allocateSalesOrderSchema>;
