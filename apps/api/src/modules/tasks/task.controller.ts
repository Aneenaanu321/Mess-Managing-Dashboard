import { Request, Response } from "express";
import { taskService } from "./task.service";
import { streamPackingSlipPdf } from "./task-packing-pdf";
import {
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
  submitTaskSchema,
  verifyTaskSchema,
  updateSopSchema,
  reportIncompleteSchema,
  fieldDayQuerySchema,
  sopComplianceQuerySchema,
  returnOriginalsDaySchema,
  reorderFieldDaySchema,
  taskSignOffSchema,
} from "./task.validation";
import { ApiError } from "../../utils/ApiError";
import { requireParam } from "../../utils/assert";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return {
    companyId: req.auth.companyId,
    branchId: req.auth.branchId,
    userId: req.auth.sub,
    roleKey: req.auth.roleKey,
  };
}

export const taskController = {
  async list(req: Request, res: Response) {
    const query = listTasksQuerySchema.parse(req.query);
    const result = await taskService.list(ctxFrom(req), query);
    res.json({
      success: true,
      data: result.items,
      meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages },
    });
  },

  async fieldDay(req: Request, res: Response) {
    const query = fieldDayQuerySchema.parse(req.query);
    const result = await taskService.fieldDay(ctxFrom(req), query);
    res.json({ success: true, data: result });
  },

  async reorderFieldDay(req: Request, res: Response) {
    const input = reorderFieldDaySchema.parse(req.body ?? {});
    const result = await taskService.reorderFieldDay(ctxFrom(req), input);
    res.json({ success: true, data: result });
  },

  async sopTemplates(_req: Request, res: Response) {
    res.json({ success: true, data: taskService.sopTemplates() });
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

  async remove(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const result = await taskService.remove(ctxFrom(req), id);
    res.json({ success: true, data: result });
  },

  async updateSop(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = updateSopSchema.parse(req.body);
    const task = await taskService.updateSop(ctxFrom(req), id, input);
    res.json({ success: true, data: task });
  },

  async signOff(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = taskSignOffSchema.parse(req.body);
    const task = await taskService.signOff(ctxFrom(req), id, input, "FIELD");
    res.json({ success: true, data: task });
  },

  async acknowledge(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const task = await taskService.acknowledge(ctxFrom(req), id);
    res.json({ success: true, data: task });
  },

  async submit(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = submitTaskSchema.parse(req.body);
    const task = await taskService.submit(ctxFrom(req), id, input);
    res.json({ success: true, data: task });
  },

  async reportIncomplete(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = reportIncompleteSchema.parse(req.body);
    const task = await taskService.reportIncomplete(ctxFrom(req), id, input);
    res.json({ success: true, data: task });
  },

  async returnOriginals(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const task = await taskService.returnOriginals(ctxFrom(req), id);
    res.json({ success: true, data: task });
  },

  async returnOriginalsForDay(req: Request, res: Response) {
    const input = returnOriginalsDaySchema.parse(req.body ?? {});
    const result = await taskService.returnOriginalsForDay(ctxFrom(req), input);
    res.json({ success: true, data: result });
  },

  async verify(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = verifyTaskSchema.parse(req.body ?? {});
    const task = await taskService.verify(ctxFrom(req), id, input);
    res.json({ success: true, data: task });
  },

  async assignableUsers(req: Request, res: Response) {
    const users = await taskService.assignableUsers(ctxFrom(req));
    res.json({ success: true, data: users });
  },

  async linkOptions(req: Request, res: Response) {
    const data = await taskService.linkOptions(ctxFrom(req));
    res.json({ success: true, data });
  },

  async sopCompliance(req: Request, res: Response) {
    const query = sopComplianceQuerySchema.parse(req.query);
    const data = await taskService.sopCompliance(ctxFrom(req), query);
    res.json({ success: true, data });
  },

  async packingSlipPdf(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const { task, company } = await taskService.getPackingSlipData(ctxFrom(req), id);
    streamPackingSlipPdf(res, task, company);
  },
};
