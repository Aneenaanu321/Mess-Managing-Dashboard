import { z } from "zod";

export const listInstallationsQuerySchema = z.object({
  customerId: z.string().optional(),
  managerId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListInstallationsQuery = z.infer<typeof listInstallationsQuerySchema>;
