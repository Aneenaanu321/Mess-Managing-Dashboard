import { Request, Response } from "express";
import { leadService } from "./lead.service";
import {
  createLeadSchema,
  updateLeadSchema,
  assignLeadSchema,
  disqualifyLeadSchema,
  listLeadsQuerySchema,
  bulkImportLeadsSchema,
} from "./lead.validation";
import { ApiError } from "../../utils/ApiError";
import { requireParam } from "../../utils/assert";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const leadController = {
  async list(req: Request, res: Response) {
    const query = listLeadsQuerySchema.parse(req.query);
    const result = await leadService.list(ctxFrom(req), query);
    res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages } });
  },

  async getById(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const lead = await leadService.getById(ctxFrom(req), id);
    res.json({ success: true, data: lead });
  },

  async create(req: Request, res: Response) {
    const input = createLeadSchema.parse(req.body);
    const lead = await leadService.create(ctxFrom(req), input);
    res.status(201).json({ success: true, data: lead });
  },

  async update(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = updateLeadSchema.parse(req.body);
    const lead = await leadService.update(ctxFrom(req), id, input);
    res.json({ success: true, data: lead });
  },

  async assign(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = assignLeadSchema.parse(req.body);
    const lead = await leadService.assign(ctxFrom(req), id, input.ownerId);
    res.json({ success: true, data: lead });
  },

  async disqualify(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = disqualifyLeadSchema.parse(req.body);
    const lead = await leadService.disqualify(ctxFrom(req), id, input.reason, input.note);
    res.json({ success: true, data: lead });
  },

  async convert(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const estimatedValue = Number(req.body?.estimatedValue);
    if (!Number.isFinite(estimatedValue) || estimatedValue < 0) {
      throw ApiError.badRequest("estimatedValue must be a non-negative number");
    }
    const result = await leadService.convert(ctxFrom(req), id, {
      title: req.body?.title,
      estimatedValue,
      currency: req.body?.currency,
    });
    res.status(201).json({ success: true, data: result });
  },

  async bulkImport(req: Request, res: Response) {
    const input = bulkImportLeadsSchema.parse(req.body);
    const result = await leadService.bulkImport(ctxFrom(req), input);
    res.status(201).json({ success: true, data: result });
  },
};
