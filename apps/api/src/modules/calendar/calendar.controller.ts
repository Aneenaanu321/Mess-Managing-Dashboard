import { Request, Response } from "express";
import { calendarService } from "./calendar.service";
import { createCalendarEventSchema, updateCalendarEventSchema, listCalendarEventsQuerySchema } from "./calendar.validation";
import { ApiError } from "../../utils/ApiError";
import { requireParam } from "../../utils/assert";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const calendarController = {
  async list(req: Request, res: Response) {
    const query = listCalendarEventsQuerySchema.parse(req.query);
    const events = await calendarService.list(ctxFrom(req), query);
    res.json({ success: true, data: events });
  },

  async getById(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const event = await calendarService.getById(ctxFrom(req), id);
    res.json({ success: true, data: event });
  },

  async create(req: Request, res: Response) {
    const input = createCalendarEventSchema.parse(req.body);
    const event = await calendarService.create(ctxFrom(req), input);
    res.status(201).json({ success: true, data: event });
  },

  async update(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = updateCalendarEventSchema.parse(req.body);
    const event = await calendarService.update(ctxFrom(req), id, input);
    res.json({ success: true, data: event });
  },
};
