import { Request, Response } from "express";
import { quotationService } from "./quotation.service";
import { streamQuotationPdf } from "./quotation.pdf";
import { prisma } from "../../config/prisma";
import { createQuotationSchema, updateQuotationSchema, listQuotationsQuerySchema } from "./quotation.validation";
import { ApiError } from "../../utils/ApiError";
import { requireParam } from "../../utils/assert";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const quotationController = {
  async list(req: Request, res: Response) {
    const query = listQuotationsQuerySchema.parse(req.query);
    const result = await quotationService.list(ctxFrom(req), query);
    res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages } });
  },

  async getById(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const quotation = await quotationService.getById(ctxFrom(req), id);
    res.json({ success: true, data: quotation });
  },

  async create(req: Request, res: Response) {
    const input = createQuotationSchema.parse(req.body);
    const quotation = await quotationService.create(ctxFrom(req), input);
    res.status(201).json({ success: true, data: quotation });
  },

  async update(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = updateQuotationSchema.parse(req.body);
    const quotation = await quotationService.update(ctxFrom(req), id, input);
    res.json({ success: true, data: quotation });
  },

  async send(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const quotation = await quotationService.send(ctxFrom(req), id);
    res.json({ success: true, data: quotation });
  },

  async approve(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const quotation = await quotationService.approve(ctxFrom(req), id);
    res.json({ success: true, data: quotation });
  },

  async pdf(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const ctx = ctxFrom(req);
    const [quotation, company] = await Promise.all([
      quotationService.getById(ctx, id),
      prisma.company.findUniqueOrThrow({ where: { id: ctx.companyId }, select: { name: true, legalName: true, taxId: true } }),
    ]);
    streamQuotationPdf(res, quotation, company);
  },
};
