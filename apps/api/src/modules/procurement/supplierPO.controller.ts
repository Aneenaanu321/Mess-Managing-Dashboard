import { Request, Response } from "express";
import { supplierPOService } from "./supplierPO.service";
import { createSupplierPOSchema, listSupplierPOsQuerySchema } from "./supplierPO.validation";
import { ApiError } from "../../utils/ApiError";
import { requireParam } from "../../utils/assert";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const supplierPOController = {
  async list(req: Request, res: Response) {
    const query = listSupplierPOsQuerySchema.parse(req.query);
    const result = await supplierPOService.list(ctxFrom(req), query);
    res.json({
      success: true,
      data: result.items,
      meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages },
    });
  },

  async getById(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const po = await supplierPOService.getById(ctxFrom(req), id);
    res.json({ success: true, data: po });
  },

  async create(req: Request, res: Response) {
    const input = createSupplierPOSchema.parse(req.body);
    const po = await supplierPOService.create(ctxFrom(req), input);
    res.status(201).json({ success: true, data: po });
  },
};
