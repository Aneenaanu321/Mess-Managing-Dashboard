import { Request, Response } from "express";
import { financeService } from "./finance.service";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  recordPaymentSchema,
  listInvoicesQuerySchema,
} from "./finance.validation";
import { ApiError } from "../../utils/ApiError";
import { requireParam } from "../../utils/assert";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const financeController = {
  async list(req: Request, res: Response) {
    const query = listInvoicesQuerySchema.parse(req.query);
    const result = await financeService.list(ctxFrom(req), query);
    res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages } });
  },

  async getById(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const invoice = await financeService.getById(ctxFrom(req), id);
    res.json({ success: true, data: invoice });
  },

  async create(req: Request, res: Response) {
    const input = createInvoiceSchema.parse(req.body);
    const invoice = await financeService.create(ctxFrom(req), input);
    res.status(201).json({ success: true, data: invoice });
  },

  async update(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = updateInvoiceSchema.parse(req.body);
    const invoice = await financeService.update(ctxFrom(req), id, input);
    res.json({ success: true, data: invoice });
  },

  async recordPayment(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = recordPaymentSchema.parse(req.body);
    const result = await financeService.recordPayment(ctxFrom(req), id, input);
    res.status(201).json({ success: true, data: result });
  },
};
