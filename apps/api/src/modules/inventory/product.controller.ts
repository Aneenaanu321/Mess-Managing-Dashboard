import { Request, Response } from "express";
import { productService } from "./product.service";
import { createProductSchema, listProductsQuerySchema, updateProductSchema } from "./product.validation";
import { ApiError } from "../../utils/ApiError";
import { requireParam } from "../../utils/assert";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const productController = {
  async list(req: Request, res: Response) {
    const query = listProductsQuerySchema.parse(req.query);
    const result = await productService.list(ctxFrom(req), query);
    res.json({
      success: true,
      data: result.items,
      meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages },
    });
  },

  async getById(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const product = await productService.getById(ctxFrom(req), id);
    res.json({ success: true, data: product });
  },

  async create(req: Request, res: Response) {
    const input = createProductSchema.parse(req.body);
    const product = await productService.create(ctxFrom(req), input);
    res.status(201).json({ success: true, data: product });
  },

  async update(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = updateProductSchema.parse(req.body);
    const product = await productService.update(ctxFrom(req), id, input);
    res.json({ success: true, data: product });
  },
};
