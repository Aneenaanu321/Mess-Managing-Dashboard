import { Request, Response } from "express";
import { deviceService } from "./device.service";
import { createDeviceSchema, updateDeviceSchema, listDevicesQuerySchema } from "./device.validation";
import { ApiError } from "../../utils/ApiError";
import { requireParam } from "../../utils/assert";

function ctxFrom(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return { companyId: req.auth.companyId, branchId: req.auth.branchId, userId: req.auth.sub };
}

export const deviceController = {
  async list(req: Request, res: Response) {
    const query = listDevicesQuerySchema.parse(req.query);
    const result = await deviceService.list(ctxFrom(req), query);
    res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages } });
  },

  async getById(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const device = await deviceService.getById(ctxFrom(req), id);
    res.json({ success: true, data: device });
  },

  async create(req: Request, res: Response) {
    const input = createDeviceSchema.parse(req.body);
    const device = await deviceService.create(ctxFrom(req), input);
    res.status(201).json({ success: true, data: device });
  },

  async update(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = updateDeviceSchema.parse(req.body);
    const device = await deviceService.update(ctxFrom(req), id, input);
    res.json({ success: true, data: device });
  },
};
