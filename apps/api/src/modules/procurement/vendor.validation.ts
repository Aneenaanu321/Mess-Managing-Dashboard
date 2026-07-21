import { z } from "zod";

export const createVendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  leadTimeDays: z.coerce.number().int().min(0).optional(),
});
export type CreateVendorInput = z.infer<typeof createVendorSchema>;

export const listVendorsQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(100),
});
export type ListVendorsQuery = z.infer<typeof listVendorsQuerySchema>;
