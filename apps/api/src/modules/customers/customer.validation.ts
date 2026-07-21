import { z } from "zod";

export const industryEnum = z.enum([
  "RETAIL",
  "LUXURY",
  "FASHION",
  "HEALTHCARE",
  "PHARMACEUTICALS",
  "WAREHOUSING",
  "MANUFACTURING",
  "GOVERNMENT",
  "LOGISTICS",
  "EDUCATION",
  "HOSPITALITY",
  "OTHER",
]);

export const primaryContactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  industry: industryEnum,
  website: z.string().optional().or(z.literal("")),
  taxId: z.string().optional(),
  ownerId: z.string().optional(),
  primaryContact: primaryContactSchema.optional(),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  industry: industryEnum.optional(),
  website: z.string().optional().or(z.literal("")),
  taxId: z.string().optional(),
  ownerId: z.string().optional(),
});
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const listCustomersQuerySchema = z.object({
  industry: industryEnum.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
