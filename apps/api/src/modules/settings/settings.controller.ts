import { Request, Response } from "express";
import { settingsService } from "./settings.service";
import { ApiError } from "../../utils/ApiError";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId };
}

export const settingsController = {
  async org(req: Request, res: Response) {
    const data = await settingsService.getOrg(ctxFrom(req));
    res.json({ success: true, data });
  },

  async roles(_req: Request, res: Response) {
    const data = await settingsService.getRoles();
    res.json({ success: true, data });
  },

  async users(req: Request, res: Response) {
    const data = await settingsService.getUsers(ctxFrom(req));
    res.json({ success: true, data });
  },
};
