import { Request, Response } from "express";
import { vendorService } from "./vendor.service";
import { createVendorSchema, listVendorsQuerySchema } from "./vendor.validation";
import { ApiError } from "../../utils/ApiError";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const vendorController = {
  async list(req: Request, res: Response) {
    const query = listVendorsQuerySchema.parse(req.query);
    const result = await vendorService.list(ctxFrom(req), query);
    res.json({
      success: true,
      data: result.items,
      meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages },
    });
  },

  async create(req: Request, res: Response) {
    const input = createVendorSchema.parse(req.body);
    const vendor = await vendorService.create(ctxFrom(req), input);
    res.status(201).json({ success: true, data: vendor });
  },
};
