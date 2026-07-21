import { Request, Response } from "express";
import { aiService } from "./ai.service";
import { aiChatSchema } from "./ai.validation";
import { ApiError } from "../../utils/ApiError";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId };
}

export const aiController = {
  async chat(req: Request, res: Response) {
    const input = aiChatSchema.parse(req.body);
    const result = await aiService.chat(ctxFrom(req), input.message);
    res.json({ success: true, data: result });
  },
};
