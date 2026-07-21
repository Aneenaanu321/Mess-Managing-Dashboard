import { z } from "zod";

export const listAuditLogQuerySchema = z.object({
  entityType: z.string().optional(),
  action: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListAuditLogQuery = z.infer<typeof listAuditLogQuerySchema>;
