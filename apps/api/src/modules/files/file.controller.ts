import { Request, Response } from "express";
import { fileService } from "./file.service";
import { listFilesQuerySchema, uploadFileBodySchema } from "./file.validation";
import { ApiError } from "../../utils/ApiError";
import { requireParam } from "../../utils/assert";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub, permissions: req.auth.permissions };
}

export const fileController = {
  async list(req: Request, res: Response) {
    const { entityType, entityId } = listFilesQuerySchema.parse(req.query);
    const files = await fileService.list(ctxFrom(req), entityType, entityId);
    res.json({ success: true, data: files });
  },

  async upload(req: Request, res: Response) {
    if (!req.file) throw ApiError.badRequest("No file uploaded (expected multipart field \"file\")");
    const { entityType, entityId } = uploadFileBodySchema.parse(req.body);
    const asset = await fileService.upload(ctxFrom(req), entityType, entityId, req.file);
    res.status(201).json({ success: true, data: asset });
  },

  async download(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    // Returns the presigned URL as JSON rather than a 302 redirect — the
    // caller needs our Bearer token to pass authenticate() on this route,
    // but a plain <a href> navigation or top-level redirect can't attach
    // one. The presigned URL itself is self-authenticating (signed query
    // string), so the frontend just opens it directly once it has it.
    const { url, fileName } = await fileService.getDownloadUrl(ctxFrom(req), id);
    res.json({ success: true, data: { url, fileName } });
  },
};
