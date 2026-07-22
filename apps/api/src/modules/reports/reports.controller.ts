import { Request, Response } from "express";
import { reportsService } from "./reports.service";
import { streamSalesReportPdf } from "./reports.pdf";
import { prisma } from "../../config/prisma";
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

  async pdf(req: Request, res: Response) {
    const ctx = ctxFrom(req);
    const [summary, aging, company, branch] = await Promise.all([
      reportsService.getSummary(ctx),
      reportsService.getReceivablesAging(ctx),
      prisma.company.findUniqueOrThrow({ where: { id: ctx.companyId }, select: { name: true, legalName: true, taxId: true, currency: true } }),
      ctx.branchId ? prisma.branch.findUnique({ where: { id: ctx.branchId }, select: { name: true } }) : Promise.resolve(null),
    ]);
    const branchLabel = branch?.name ?? "All Branches";
    streamSalesReportPdf(res, company, company.currency, branchLabel, summary, aging);
  },
};
