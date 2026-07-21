import { Request, Response } from "express";
import { customerPOService } from "./customerPO.service";
import { createCustomerPOSchema, listCustomerPOsQuerySchema } from "./customerPO.validation";
import { ApiError } from "../../utils/ApiError";
import { requireParam } from "../../utils/assert";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const customerPOController = {
  async list(req: Request, res: Response) {
    const query = listCustomerPOsQuerySchema.parse(req.query);
    const result = await customerPOService.list(ctxFrom(req), query);
    res.json({
      success: true,
      data: result.items,
      meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages },
    });
  },

  async getById(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const po = await customerPOService.getById(ctxFrom(req), id);
    res.json({ success: true, data: po });
  },

  async create(req: Request, res: Response) {
    const input = createCustomerPOSchema.parse(req.body);
    const po = await customerPOService.create(ctxFrom(req), input);
    res.status(201).json({ success: true, data: po });
  },

  async verify(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const po = await customerPOService.verify(ctxFrom(req), id);
    res.json({ success: true, data: po });
  },

  async recordAdvance(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const po = await customerPOService.recordAdvance(ctxFrom(req), id);
    res.json({ success: true, data: po });
  },
};
