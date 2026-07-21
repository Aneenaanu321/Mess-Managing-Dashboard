import { Request, Response } from "express";
import { settingsService } from "./settings.service";
import { listAuditLogQuerySchema, upsertSlaPolicySchema } from "./settings.validation";
import { ApiError } from "../../utils/ApiError";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, userId: req.auth.sub };
}

export const settingsController = {
  async org(req: Request, res: Response) {
    const data = await settingsService.getOrg(ctxFrom(req));
    res.json({ success: true, data });
  },

  async roles(_req: Request, res: Response) {
    const data = await settingsService.getRoles();
    res.json({ success: true, data });
  },

  async users(req: Request, res: Response) {
    const data = await settingsService.getUsers(ctxFrom(req));
    res.json({ success: true, data });
  },

  async sequences(req: Request, res: Response) {
    const data = await settingsService.getSequences(ctxFrom(req));
    res.json({ success: true, data });
  },

  async auditLog(req: Request, res: Response) {
    const query = listAuditLogQuerySchema.parse(req.query);
    const result = await settingsService.getAuditLog(ctxFrom(req), query);
    res.json({
      success: true,
      data: result.items,
      meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages },
    });
  },

  async slaPolicies(req: Request, res: Response) {
    const data = await settingsService.getSlaPolicies(ctxFrom(req));
    res.json({ success: true, data });
  },

  async upsertSlaPolicy(req: Request, res: Response) {
    const input = upsertSlaPolicySchema.parse(req.body);
    const data = await settingsService.upsertSlaPolicy(ctxFrom(req), input);
    res.json({ success: true, data });
  },
};
