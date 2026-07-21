import { Request, Response } from "express";
import { activityService } from "./activity.service";
import { createActivitySchema, listActivitiesQuerySchema } from "./activity.validation";
import { ApiError } from "../../utils/ApiError";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const activityController = {
  async list(req: Request, res: Response) {
    const query = listActivitiesQuerySchema.parse(req.query);
    const activities = await activityService.list(ctxFrom(req), query);
    res.json({ success: true, data: activities });
  },

  async create(req: Request, res: Response) {
    const input = createActivitySchema.parse(req.body);
    const activity = await activityService.create(ctxFrom(req), input);
    res.status(201).json({ success: true, data: activity });
  },
};
