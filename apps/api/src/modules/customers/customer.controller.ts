import { Request, Response } from "express";
import { customerService } from "./customer.service";
import { createCustomerSchema, updateCustomerSchema, listCustomersQuerySchema, mergeCustomersSchema, updateSiteSchema } from "./customer.validation";
import { ApiError } from "../../utils/ApiError";
import { requireParam } from "../../utils/assert";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const customerController = {
  async list(req: Request, res: Response) {
    const query = listCustomersQuerySchema.parse(req.query);
    const result = await customerService.list(ctxFrom(req), query);
    res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages } });
  },

  async getById(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const customer = await customerService.getById(ctxFrom(req), id);
    res.json({ success: true, data: customer });
  },

  async create(req: Request, res: Response) {
    const input = createCustomerSchema.parse(req.body);
    const customer = await customerService.create(ctxFrom(req), input);
    res.status(201).json({ success: true, data: customer });
  },

  async update(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = updateCustomerSchema.parse(req.body);
    const customer = await customerService.update(ctxFrom(req), id, input);
    res.json({ success: true, data: customer });
  },

  async merge(req: Request, res: Response) {
    const input = mergeCustomersSchema.parse(req.body);
    const customer = await customerService.merge(ctxFrom(req), input.sourceId, input.targetId);
    res.json({ success: true, data: customer });
  },

  async updateSite(req: Request, res: Response) {
    const customerId = requireParam(req.params.id, "id");
    const siteId = requireParam(req.params.siteId, "siteId");
    const input = updateSiteSchema.parse(req.body);
    const site = await customerService.updateSite(ctxFrom(req), customerId, siteId, input);
    res.json({ success: true, data: site });
  },
};
