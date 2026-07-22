import { Request, Response } from "express";
import { reportsService } from "./reports.service";
import { ApiError } from "../../utils/ApiError";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  const branchId = typeof req.query.branchId === "string" && req.query.branchId ? req.query.branchId : undefined;
  return { companyId: req.auth.companyId, branchId };
}

export const reportsController = {
  async executive(req: Request, res: Response) {
    const data = await reportsService.getExecutiveSummary(ctxFrom(req));
    res.json({ success: true, data });
  },

  async summary(req: Request, res: Response) {
    const data = await reportsService.getSummary(ctxFrom(req));
    res.json({ success: true, data });
  },

  async receivablesAging(req: Request, res: Response) {
    const data = await reportsService.getReceivablesAging(ctxFrom(req));
    res.json({ success: true, data });
  },
};
