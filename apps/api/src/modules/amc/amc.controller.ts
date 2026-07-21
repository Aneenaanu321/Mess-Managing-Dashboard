import { Request, Response } from "express";
import { amcService } from "./amc.service";
import { createAmcContractSchema, updateAmcContractSchema, listAmcContractsQuerySchema } from "./amc.validation";
import { ApiError } from "../../utils/ApiError";
import { requireParam } from "../../utils/assert";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const amcController = {
  async list(req: Request, res: Response) {
    const query = listAmcContractsQuerySchema.parse(req.query);
    const result = await amcService.list(ctxFrom(req), query);
    res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages } });
  },

  async getById(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const contract = await amcService.getById(ctxFrom(req), id);
    res.json({ success: true, data: contract });
  },

  async create(req: Request, res: Response) {
    const input = createAmcContractSchema.parse(req.body);
    const contract = await amcService.create(ctxFrom(req), input);
    res.status(201).json({ success: true, data: contract });
  },

  async update(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = updateAmcContractSchema.parse(req.body);
    const contract = await amcService.update(ctxFrom(req), id, input);
    res.json({ success: true, data: contract });
  },
};
