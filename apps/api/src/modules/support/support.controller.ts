import { Request, Response } from "express";
import { supportService } from "./support.service";
import {
  createTicketSchema,
  updateTicketSchema,
  createTicketCommentSchema,
  listTicketsQuerySchema,
} from "./support.validation";
import { ApiError } from "../../utils/ApiError";
import { requireParam } from "../../utils/assert";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const supportController = {
  async list(req: Request, res: Response) {
    const query = listTicketsQuerySchema.parse(req.query);
    const result = await supportService.list(ctxFrom(req), query);
    res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages } });
  },

  async getById(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const ticket = await supportService.getById(ctxFrom(req), id);
    res.json({ success: true, data: ticket });
  },

  async create(req: Request, res: Response) {
    const input = createTicketSchema.parse(req.body);
    const ticket = await supportService.create(ctxFrom(req), input);
    res.status(201).json({ success: true, data: ticket });
  },

  async update(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = updateTicketSchema.parse(req.body);
    const ticket = await supportService.update(ctxFrom(req), id, input);
    res.json({ success: true, data: ticket });
  },

  async addComment(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = createTicketCommentSchema.parse(req.body);
    const comment = await supportService.addComment(ctxFrom(req), id, input);
    res.status(201).json({ success: true, data: comment });
  },
};
