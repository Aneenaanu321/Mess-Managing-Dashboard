import { Request, Response } from "express";
import { approvalService } from "./approval.service";
import { listApprovalsQuerySchema, decideApprovalSchema } from "./approval.validation";
import { ApiError } from "../../utils/ApiError";
import { requireParam } from "../../utils/assert";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const approvalController = {
  async list(req: Request, res: Response) {
    const query = listApprovalsQuerySchema.parse(req.query);
    const approvals = await approvalService.list(ctxFrom(req), query);
    res.json({ success: true, data: approvals });
  },

  async decide(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = decideApprovalSchema.parse(req.body);
    const approval = await approvalService.decide(ctxFrom(req), id, input);
    res.json({ success: true, data: approval });
  },
};
