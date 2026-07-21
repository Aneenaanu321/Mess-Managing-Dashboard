import { amcRepository } from "./amc.repository";
import { CreateAmcContractInput, UpdateAmcContractInput, ListAmcContractsQuery } from "./amc.validation";
import { ApiError } from "../../utils/ApiError";
import { nextNumber } from "../../utils/numberSequence";
import { writeAuditLog } from "../../utils/audit";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

const EXPIRY_WINDOW_DAYS = 90;

function withExpiringFlag<T extends { endDate: Date | string; status: string }>(contract: T) {
  const daysToExpiry = Math.ceil((new Date(contract.endDate).getTime() - Date.now()) / 86_400_000);
  const expiringSoon = ["ACTIVE", "EXPIRING_SOON"].includes(contract.status) && daysToExpiry <= EXPIRY_WINDOW_DAYS;
  return { ...contract, daysToExpiry, expiringSoon };
}

export const amcService = {
  async list(ctx: ActorCtx, query: ListAmcContractsQuery) {
    const { expiringOnly, ...rest } = query;
    const expiringBefore = expiringOnly ? new Date(Date.now() + EXPIRY_WINDOW_DAYS * 86_400_000) : undefined;
    const result = await amcRepository.list({ companyId: ctx.companyId, expiringBefore, ...rest });
    return { ...result, items: result.items.map(withExpiringFlag) };
  },

  async getById(ctx: ActorCtx, id: string) {
    const contract = await amcRepository.findById(ctx.companyId, id);
    if (!contract) throw ApiError.notFound("AMC contract not found");
    return withExpiringFlag(contract);
  },

  async create(ctx: ActorCtx, input: CreateAmcContractInput) {
    const code = await nextNumber(ctx.companyId, "AMC", "AMC");

    const contract = await amcRepository.create({
      companyId: ctx.companyId,
      branchId: ctx.branchId,
      code,
      customer: { connect: { id: input.customerId } },
      currency: input.currency || "AED",
      contractValue: input.annualValue,
      startDate: input.startDate,
      endDate: input.endDate,
      ...(input.deviceIds?.length
        ? { devices: { create: input.deviceIds.map((deviceId) => ({ device: { connect: { id: deviceId } } })) } }
        : {}),
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "AmcContract",
      entityId: contract.id,
      action: "CREATE",
      after: contract,
    });

    return withExpiringFlag(contract);
  },

  async update(ctx: ActorCtx, id: string, input: UpdateAmcContractInput) {
    const existing = await amcRepository.findByIdBare(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("AMC contract not found");

    if (input.deviceIds) {
      await amcRepository.replaceDevices(id, input.deviceIds);
    }

    const updated = await amcRepository.update(id, {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
      ...(input.annualValue !== undefined ? { contractValue: input.annualValue } : {}),
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "AmcContract",
      entityId: id,
      action: "UPDATE",
      before: existing,
      after: updated,
    });

    return withExpiringFlag(updated);
  },
};
