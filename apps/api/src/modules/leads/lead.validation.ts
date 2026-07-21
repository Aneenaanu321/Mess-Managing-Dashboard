import { z } from "zod";

export const leadSourceEnum = z.enum([
  "WEBSITE",
  "REFERRAL",
  "COLD_CALL",
  "EXHIBITION",
  "PARTNER",
  "SOCIAL_MEDIA",
  "EMAIL_CAMPAIGN",
  "INBOUND_CALL",
  "OTHER",
]);

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

export const disqualifyReasonEnum = z.enum([
  "BUDGET",
  "TIMING",
  "NO_AUTHORITY",
  "NOT_INTERESTED",
  "COMPETITOR",
  "OTHER",
]);

export const createLeadSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(1).optional(),
  source: leadSourceEnum,
  industry: industryEnum,
  campaignId: z.string().optional(),
  ownerId: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => data.email || data.phone, {
  message: "At least one of email or phone is required",
  path: ["email"],
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = z.object({
  companyName: z.string().min(1).optional(),
  contactName: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(1).optional(),
  source: leadSourceEnum.optional(),
  industry: industryEnum.optional(),
  notes: z.string().optional(),
});
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

export const assignLeadSchema = z.object({
  ownerId: z.string().min(1, "ownerId is required"),
});

export const disqualifyLeadSchema = z.object({
  reason: disqualifyReasonEnum,
  note: z.string().optional(),
});

export const listLeadsQuerySchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "DISQUALIFIED", "CONVERTED"]).optional(),
  ownerId: z.string().optional(),
  industry: industryEnum.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
