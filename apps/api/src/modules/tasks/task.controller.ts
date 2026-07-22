import { Request, Response } from "express";
import { taskService } from "./task.service";
import { createTaskSchema, updateTaskSchema, listTasksQuerySchema } from "./task.validation";
import { ApiError } from "../../utils/ApiError";
import { requireParam } from "../../utils/assert";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const taskController = {
  async list(req: Request, res: Response) {
    const query = listTasksQuerySchema.parse(req.query);
    const result = await taskService.list(ctxFrom(req), query);
    res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages } });
  },

  async getById(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const task = await taskService.getById(ctxFrom(req), id);
    res.json({ success: true, data: task });
  },

  async create(req: Request, res: Response) {
    const input = createTaskSchema.parse(req.body);
    const task = await taskService.create(ctxFrom(req), input);
    res.status(201).json({ success: true, data: task });
  },

  async update(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = updateTaskSchema.parse(req.body);
    const task = await taskService.update(ctxFrom(req), id, input);
    res.json({ success: true, data: task });
  },

  async assignableUsers(req: Request, res: Response) {
    const users = await taskService.assignableUsers(ctxFrom(req));
    res.json({ success: true, data: users });
  },
};
