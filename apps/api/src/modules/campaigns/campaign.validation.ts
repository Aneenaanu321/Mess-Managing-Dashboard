import { z } from "zod";

export const createCampaignSchema = z.object({
  name: z.string().min(1, "Name is required"),
  channel: z.string().min(1, "Channel is required"),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  budget: z.coerce.number().min(0).optional(),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = createCampaignSchema.partial();
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

export const listCampaignsQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;
