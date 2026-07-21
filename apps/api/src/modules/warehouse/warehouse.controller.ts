import { Request, Response } from "express";
import { warehouseService } from "./warehouse.service";
import { adjustStockSchema, listStockQuerySchema } from "./warehouse.validation";
import { ApiError } from "../../utils/ApiError";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const warehouseController = {
  async listWarehouses(req: Request, res: Response) {
    const warehouses = await warehouseService.listWarehouses(ctxFrom(req));
    res.json({ success: true, data: warehouses });
  },

  async listStock(req: Request, res: Response) {
    const query = listStockQuerySchema.parse(req.query);
    const result = await warehouseService.listStock(ctxFrom(req), query);
    res.json({
      success: true,
      data: result.items,
      meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages },
    });
  },

  async adjust(req: Request, res: Response) {
    const input = adjustStockSchema.parse(req.body);
    const result = await warehouseService.adjust(ctxFrom(req), input);
    res.status(201).json({ success: true, data: result });
  },
};
