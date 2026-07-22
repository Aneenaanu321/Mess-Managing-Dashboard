import { Request, Response } from "express";
import { salesOpsService } from "./salesOps.service";
import { handoverNoteSchema, updateLeadOpsSettingsSchema, scheduleMeetingSchema } from "./salesOps.validation";
import { ApiError } from "../../utils/ApiError";
import { requireParam } from "../../utils/assert";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const salesOpsController = {
  async worklist(req: Request, res: Response) {
    const data = await salesOpsService.worklist(ctxFrom(req));
    res.json({ success: true, data });
  },

  async handoffs(req: Request, res: Response) {
    const data = await salesOpsService.handoffs(ctxFrom(req));
    res.json({ success: true, data });
  },

  async hygiene(req: Request, res: Response) {
    const data = await salesOpsService.hygiene(ctxFrom(req));
    res.json({ success: true, data });
  },

  async metrics(req: Request, res: Response) {
    const data = await salesOpsService.metrics(ctxFrom(req));
    res.json({ success: true, data });
  },

  async getSettings(req: Request, res: Response) {
    const data = await salesOpsService.getLeadOpsSettings(ctxFrom(req));
    res.json({ success: true, data });
  },

  async updateSettings(req: Request, res: Response) {
    const input = updateLeadOpsSettingsSchema.parse(req.body);
    const data = await salesOpsService.updateLeadOpsSettings(ctxFrom(req), input);
    res.json({ success: true, data });
  },

  async listHandovers(req: Request, res: Response) {
    const data = await salesOpsService.listHandovers(ctxFrom(req));
    res.json({ success: true, data });
  },

  async createHandover(req: Request, res: Response) {
    const input = handoverNoteSchema.parse(req.body);
    const data = await salesOpsService.createHandover(ctxFrom(req), input.body);
    res.status(201).json({ success: true, data });
  },

  async dealSummary(req: Request, res: Response) {
    const id = requireParam(req.params.opportunityId, "opportunityId");
    const data = await salesOpsService.dealSummary(ctxFrom(req), id);
    res.json({ success: true, data });
  },

  async quotationRevisions(req: Request, res: Response) {
    const id = requireParam(req.params.quotationId, "quotationId");
    const data = await salesOpsService.quotationRevisions(ctxFrom(req), id);
    res.json({ success: true, data });
  },

  async scheduleMeeting(req: Request, res: Response) {
    const input = scheduleMeetingSchema.parse(req.body);
    const data = await salesOpsService.scheduleMeeting(ctxFrom(req), input);
    res.status(201).json({ success: true, data });
  },
};
