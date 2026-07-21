import { Request, Response } from "express";
import { dashboardService } from "./dashboard.service";
import { ApiError } from "../../utils/ApiError";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId };
}

export const dashboardController = {
  async summary(req: Request, res: Response) {
    const data = await dashboardService.getExecutiveSummary(ctxFrom(req));
    res.json({ success: true, data });
  },
};
