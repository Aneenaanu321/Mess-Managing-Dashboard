import { Request, Response } from "express";
import { salesOrderService } from "./salesOrder.service";
import { listSalesOrdersQuerySchema, allocateSalesOrderSchema } from "./salesOrder.validation";
import { ApiError } from "../../utils/ApiError";
import { requireParam } from "../../utils/assert";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const salesOrderController = {
  async list(req: Request, res: Response) {
    const query = listSalesOrdersQuerySchema.parse(req.query);
    const result = await salesOrderService.list(ctxFrom(req), query);
    res.json({
      success: true,
      data: result.items,
      meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages },
    });
  },

  async getById(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const salesOrder = await salesOrderService.getById(ctxFrom(req), id);
    res.json({ success: true, data: salesOrder });
  },

  async allocate(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = allocateSalesOrderSchema.parse(req.body);
    const salesOrder = await salesOrderService.allocate(ctxFrom(req), id, input.warehouseId);
    res.json({ success: true, data: salesOrder });
  },
};
