import { Request, Response } from "express";
import { opportunityService } from "./opportunity.service";
import {
  createOpportunitySchema,
  updateOpportunitySchema,
  changeStageSchema,
  listOpportunitiesQuerySchema,
} from "./opportunity.validation";
import { ApiError } from "../../utils/ApiError";
import { requireParam } from "../../utils/assert";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const opportunityController = {
  async list(req: Request, res: Response) {
    const query = listOpportunitiesQuerySchema.parse(req.query);
    const result = await opportunityService.list(ctxFrom(req), query);
    res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages } });
  },

  async getById(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const opportunity = await opportunityService.getById(ctxFrom(req), id);
    res.json({ success: true, data: opportunity });
  },

  async create(req: Request, res: Response) {
    const input = createOpportunitySchema.parse(req.body);
    const opportunity = await opportunityService.create(ctxFrom(req), input);
    res.status(201).json({ success: true, data: opportunity });
  },

  async update(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = updateOpportunitySchema.parse(req.body);
    const opportunity = await opportunityService.update(ctxFrom(req), id, input);
    res.json({ success: true, data: opportunity });
  },

  async changeStage(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = changeStageSchema.parse(req.body);
    const opportunity = await opportunityService.changeStage(ctxFrom(req), id, input);
    res.json({ success: true, data: opportunity });
  },
};
