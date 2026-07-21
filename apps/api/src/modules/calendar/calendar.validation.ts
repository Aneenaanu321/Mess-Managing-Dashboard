import { z } from "zod";

export const calendarEventTypeEnum = z.enum(["FOLLOW_UP", "MEETING", "SITE_VISIT", "DEMO", "INSTALLATION", "TRAINING", "OTHER"]);

export const createCalendarEventSchema = z.object({
  type: calendarEventTypeEnum,
  title: z.string().min(1, "Title is required"),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional(),
  opportunityId: z.string().optional(),
  reminderAt: z.coerce.date().optional(),
  ownerId: z.string().optional(),
});
export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;

export const updateCalendarEventSchema = z.object({
  type: calendarEventTypeEnum.optional(),
  title: z.string().min(1).optional(),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
  reminderAt: z.coerce.date().optional(),
  completed: z.boolean().optional(),
});
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;

export const listCalendarEventsQuerySchema = z.object({
  ownerId: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  includeCompleted: z.coerce.boolean().default(false),
});
export type ListCalendarEventsQuery = z.infer<typeof listCalendarEventsQuerySchema>;
