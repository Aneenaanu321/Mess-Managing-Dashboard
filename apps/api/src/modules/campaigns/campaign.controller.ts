import { Request, Response } from "express";
import { campaignService } from "./campaign.service";
import { createCampaignSchema, updateCampaignSchema, listCampaignsQuerySchema } from "./campaign.validation";
import { ApiError } from "../../utils/ApiError";
import { requireParam } from "../../utils/assert";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const campaignController = {
  async list(req: Request, res: Response) {
    const query = listCampaignsQuerySchema.parse(req.query);
    const result = await campaignService.list(ctxFrom(req), query);
    res.json({
      success: true,
      data: result.items,
      meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages },
    });
  },

  async getById(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const campaign = await campaignService.getById(ctxFrom(req), id);
    res.json({ success: true, data: campaign });
  },

  async create(req: Request, res: Response) {
    const input = createCampaignSchema.parse(req.body);
    const campaign = await campaignService.create(ctxFrom(req), input);
    res.status(201).json({ success: true, data: campaign });
  },

  async update(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = updateCampaignSchema.parse(req.body);
    const campaign = await campaignService.update(ctxFrom(req), id, input);
    res.json({ success: true, data: campaign });
  },
};
