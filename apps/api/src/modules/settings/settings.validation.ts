import { z } from "zod";

export const listAuditLogQuerySchema = z.object({
  entityType: z.string().optional(),
  action: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListAuditLogQuery = z.infer<typeof listAuditLogQuerySchema>;

export const upsertSlaPolicySchema = z.object({
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  responseMins: z.coerce.number().int().positive("Response time must be a positive number of minutes"),
  resolutionMins: z.coerce.number().int().positive("Resolution time must be a positive number of minutes"),
});
export type UpsertSlaPolicyInput = z.infer<typeof upsertSlaPolicySchema>;
