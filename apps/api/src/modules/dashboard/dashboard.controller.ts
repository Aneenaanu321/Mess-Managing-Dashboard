import { Request, Response } from "express";
import { dashboardService } from "./dashboard.service";
import { ApiError } from "../../utils/ApiError";
import { prisma } from "../../config/prisma";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  const branchId = typeof req.query.branchId === "string" && req.query.branchId ? req.query.branchId : undefined;
  // companyId is always ANDed in below the caller can't widen scope by
  // passing another tenant's branchId — worst case is a legitimately-empty
  // result, not a leak.
  return { companyId: req.auth.companyId, branchId };
}

export const dashboardController = {
  async summary(req: Request, res: Response) {
    const data = await dashboardService.getExecutiveSummary(ctxFrom(req));
    res.json({ success: true, data });
  },

  async spotlight(req: Request, res: Response) {
    const data = await dashboardService.getSpotlight(ctxFrom(req));
    res.json({ success: true, data });
  },

  // Lightweight, name-only branch list for the Dashboard/Reports branch
  // filter — deliberately not gated behind Settings permissions (only
  // Super Admin holds those) since MD/Sales Director are exactly who'd use
  // this filter and don't manage org settings.
  async branches(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const branches = await prisma.branch.findMany({
      where: { companyId: req.auth.companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: branches });
  },
};
