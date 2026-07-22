import { z } from "zod";

export const handoverNoteSchema = z.object({
  body: z.string().min(1).max(5000),
});

export const updateLeadOpsSettingsSchema = z.object({
  leadAssignMode: z.enum(["MANUAL", "ROUND_ROBIN"]).optional(),
  leadSlaHours: z.coerce.number().int().min(1).max(168).optional(),
  quoteChaseDays: z.coerce.number().int().min(1).max(90).optional(),
});
export type UpdateLeadOpsSettingsInput = z.infer<typeof updateLeadOpsSettingsSchema>;

export const scheduleMeetingSchema = z.object({
  opportunityId: z.string().min(1),
  type: z.enum(["DEMO", "SITE_VISIT", "MEETING", "FOLLOW_UP"]),
  title: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  ownerId: z.string().optional(),
  note: z.string().optional(),
});
