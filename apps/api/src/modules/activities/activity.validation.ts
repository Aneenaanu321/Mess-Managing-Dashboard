import { z } from "zod";

export const activityTypeEnum = z.enum(["CALL", "EMAIL", "MEETING", "NOTE", "SITE_VISIT", "DOCUMENT", "OTHER"]);

export const createActivitySchema = z
  .object({
    type: activityTypeEnum,
    subject: z.string().min(1, "Subject is required"),
    body: z.string().optional(),
    durationMins: z.coerce.number().int().nonnegative().optional(),
    occurredAt: z.coerce.date().optional(),
    leadId: z.string().optional(),
    customerId: z.string().optional(),
    opportunityId: z.string().optional(),
  })
  .refine((data) => !!(data.leadId || data.customerId || data.opportunityId), {
    message: "One of leadId, customerId, or opportunityId is required",
    path: ["leadId"],
  });
export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export const listActivitiesQuerySchema = z
  .object({
    leadId: z.string().optional(),
    customerId: z.string().optional(),
    opportunityId: z.string().optional(),
  })
  .refine((data) => !!(data.leadId || data.customerId || data.opportunityId), {
    message: "One of leadId, customerId, or opportunityId is required",
    path: ["leadId"],
  });
export type ListActivitiesQuery = z.infer<typeof listActivitiesQuerySchema>;
