import { Request, Response } from "express";
import { projectService } from "./project.service";
import { createProjectSchema, updateProjectSchema, updateMilestoneSchema, listProjectsQuerySchema } from "./project.validation";
import { ApiError } from "../../utils/ApiError";
import { requireParam } from "../../utils/assert";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const projectController = {
  async list(req: Request, res: Response) {
    const query = listProjectsQuerySchema.parse(req.query);
    const result = await projectService.list(ctxFrom(req), query);
    res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages } });
  },

  async getById(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const project = await projectService.getById(ctxFrom(req), id);
    res.json({ success: true, data: project });
  },

  async create(req: Request, res: Response) {
    const input = createProjectSchema.parse(req.body);
    const project = await projectService.create(ctxFrom(req), input);
    res.status(201).json({ success: true, data: project });
  },

  async update(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = updateProjectSchema.parse(req.body);
    const project = await projectService.update(ctxFrom(req), id, input);
    res.json({ success: true, data: project });
  },

  async updateMilestone(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const milestoneId = requireParam(req.params.milestoneId, "milestoneId");
    const input = updateMilestoneSchema.parse(req.body);
    const milestone = await projectService.updateMilestone(ctxFrom(req), id, milestoneId, input);
    res.json({ success: true, data: milestone });
  },
};
