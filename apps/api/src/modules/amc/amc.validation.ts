import { z } from "zod";

export const amcStatusEnum = z.enum(["ACTIVE", "EXPIRING_SOON", "LAPSED", "RENEWED", "CANCELLED"]);

export const createAmcContractSchema = z.object({
  customerId: z.string().min(1, "customerId is required"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  annualValue: z.coerce.number().min(0),
  currency: z.string().optional(),
  deviceIds: z.array(z.string()).optional(),
}).refine((data) => data.endDate > data.startDate, {
  message: "endDate must be after startDate",
  path: ["endDate"],
});
export type CreateAmcContractInput = z.infer<typeof createAmcContractSchema>;

export const updateAmcContractSchema = z.object({
  status: amcStatusEnum.optional(),
  endDate: z.coerce.date().optional(),
  annualValue: z.coerce.number().min(0).optional(),
  deviceIds: z.array(z.string()).optional(),
});
export type UpdateAmcContractInput = z.infer<typeof updateAmcContractSchema>;

export const listAmcContractsQuerySchema = z.object({
  status: amcStatusEnum.optional(),
  customerId: z.string().optional(),
  expiringOnly: z.coerce.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListAmcContractsQuery = z.infer<typeof listAmcContractsQuerySchema>;
