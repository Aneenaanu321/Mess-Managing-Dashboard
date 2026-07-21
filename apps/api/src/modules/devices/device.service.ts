import { deviceRepository } from "./device.repository";
import { CreateDeviceInput, UpdateDeviceInput, ListDevicesQuery } from "./device.validation";
import { ApiError } from "../../utils/ApiError";
import { writeAuditLog } from "../../utils/audit";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

export const deviceService = {
  async list(ctx: ActorCtx, query: ListDevicesQuery) {
    return deviceRepository.list({ companyId: ctx.companyId, ...query });
  },

  async getById(ctx: ActorCtx, id: string) {
    const device = await deviceRepository.findById(ctx.companyId, id);
    if (!device) throw ApiError.notFound("Device not found");
    return device;
  },

  async create(ctx: ActorCtx, input: CreateDeviceInput) {
    // Device has no human-friendly `code` field in the schema — the serial
    // number (unique per company) is the natural business identifier, so we
    // don't mint a NumberSequence code here (unlike Project/Invoice/etc).
    const existing = await deviceRepository.findBySerial(ctx.companyId, input.serialNumber);
    if (existing) throw ApiError.conflict(`A device with serial number ${input.serialNumber} already exists`);

    const device = await deviceRepository.create({
      companyId: ctx.companyId,
      serialNumber: input.serialNumber,
      type: input.type,
      product: { connect: { id: input.productId } },
      ...(input.siteId ? { site: { connect: { id: input.siteId } } } : {}),
      ...(input.projectId ? { project: { connect: { id: input.projectId } } } : {}),
      ...(input.firmwareVersion ? { firmwareVersion: input.firmwareVersion } : {}),
      ...(input.location ? { location: input.location } : {}),
      ...(input.projectId ? { status: "ALLOCATED" } : {}),
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Device",
      entityId: device.id,
      action: "CREATE",
      after: device,
    });

    return device;
  },

  async update(ctx: ActorCtx, id: string, input: UpdateDeviceInput) {
    const existing = await deviceRepository.findByIdBare(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Device not found");

    const updated = await deviceRepository.update(id, {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.siteId !== undefined ? { site: { connect: { id: input.siteId } } } : {}),
      ...(input.projectId !== undefined ? { project: { connect: { id: input.projectId } } } : {}),
      ...(input.firmwareVersion !== undefined ? { firmwareVersion: input.firmwareVersion } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.configuration !== undefined ? { configuration: input.configuration } : {}),
      ...(input.installedAt !== undefined ? { installedAt: input.installedAt } : {}),
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Device",
      entityId: id,
      action: "UPDATE",
      before: existing,
      after: updated,
    });

    return updated;
  },
};
