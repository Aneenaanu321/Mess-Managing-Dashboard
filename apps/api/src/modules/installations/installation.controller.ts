import { Request, Response } from "express";
import { installationService } from "./installation.service";
import { listInstallationsQuerySchema } from "./installation.validation";
import { ApiError } from "../../utils/ApiError";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const installationController = {
  async list(req: Request, res: Response) {
    const query = listInstallationsQuerySchema.parse(req.query);
    const result = await installationService.list(ctxFrom(req), query);
    res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages } });
  },
};
