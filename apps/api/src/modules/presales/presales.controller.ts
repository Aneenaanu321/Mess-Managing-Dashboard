import { Request, Response } from "express";
import { presalesService } from "./presales.service";
import {
  opportunityScopeQuerySchema,
  createSiteSurveySchema,
  createDemoSchema,
  createPocSchema,
  createSolutionDesignSchema,
} from "./presales.validation";
import { ApiError } from "../../utils/ApiError";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const presalesController = {
  async listSiteSurveys(req: Request, res: Response) {
    const { opportunityId } = opportunityScopeQuerySchema.parse(req.query);
    res.json({ success: true, data: await presalesService.listSiteSurveys(ctxFrom(req), opportunityId) });
  },
  async createSiteSurvey(req: Request, res: Response) {
    const input = createSiteSurveySchema.parse(req.body);
    res.status(201).json({ success: true, data: await presalesService.createSiteSurvey(ctxFrom(req), input) });
  },

  async listDemos(req: Request, res: Response) {
    const { opportunityId } = opportunityScopeQuerySchema.parse(req.query);
    res.json({ success: true, data: await presalesService.listDemos(ctxFrom(req), opportunityId) });
  },
  async createDemo(req: Request, res: Response) {
    const input = createDemoSchema.parse(req.body);
    res.status(201).json({ success: true, data: await presalesService.createDemo(ctxFrom(req), input) });
  },

  async listPocs(req: Request, res: Response) {
    const { opportunityId } = opportunityScopeQuerySchema.parse(req.query);
    res.json({ success: true, data: await presalesService.listPocs(ctxFrom(req), opportunityId) });
  },
  async createPoc(req: Request, res: Response) {
    const input = createPocSchema.parse(req.body);
    res.status(201).json({ success: true, data: await presalesService.createPoc(ctxFrom(req), input) });
  },

  async listSolutionDesigns(req: Request, res: Response) {
    const { opportunityId } = opportunityScopeQuerySchema.parse(req.query);
    res.json({ success: true, data: await presalesService.listSolutionDesigns(ctxFrom(req), opportunityId) });
  },
  async createSolutionDesign(req: Request, res: Response) {
    const input = createSolutionDesignSchema.parse(req.body);
    res.status(201).json({ success: true, data: await presalesService.createSolutionDesign(ctxFrom(req), input) });
  },
};
