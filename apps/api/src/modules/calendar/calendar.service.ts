import { calendarRepository } from "./calendar.repository";
import { CreateCalendarEventInput, UpdateCalendarEventInput, ListCalendarEventsQuery } from "./calendar.validation";
import { ApiError } from "../../utils/ApiError";
import { writeAuditLog } from "../../utils/audit";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

export const calendarService = {
  list(ctx: ActorCtx, query: ListCalendarEventsQuery) {
    // Default to the caller's own calendar — seeing a teammate's follow-ups requires an explicit ownerId.
    return calendarRepository.list({ companyId: ctx.companyId, ownerId: query.ownerId ?? ctx.userId, from: query.from, to: query.to, includeCompleted: query.includeCompleted });
  },

  async getById(ctx: ActorCtx, id: string) {
    const event = await calendarRepository.findById(ctx.companyId, id);
    if (!event) throw ApiError.notFound("Calendar event not found");
    return event;
  },

  async create(ctx: ActorCtx, input: CreateCalendarEventInput) {
    const event = await calendarRepository.create({
      companyId: ctx.companyId,
      owner: { connect: { id: input.ownerId ?? ctx.userId } },
      type: input.type,
      title: input.title,
      startAt: input.startAt,
      endAt: input.endAt,
      reminderAt: input.reminderAt,
      ...(input.opportunityId ? { opportunity: { connect: { id: input.opportunityId } } } : {}),
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "CalendarEvent",
      entityId: event.id,
      action: "CREATE",
      after: event,
    });

    return event;
  },

  async update(ctx: ActorCtx, id: string, input: UpdateCalendarEventInput) {
    const existing = await calendarRepository.findById(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Calendar event not found");

    const { completed, ...rest } = input;
    const updated = await calendarRepository.update(id, {
      ...rest,
      ...(completed === true ? { completedAt: new Date() } : {}),
      ...(completed === false ? { completedAt: null } : {}),
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "CalendarEvent",
      entityId: id,
      action: "UPDATE",
      before: existing,
      after: updated,
    });

    return updated;
  },
};
