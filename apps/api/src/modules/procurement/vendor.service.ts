import { vendorRepository } from "./vendor.repository";
import { CreateVendorInput, ListVendorsQuery } from "./vendor.validation";
import { writeAuditLog } from "../../utils/audit";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

export const vendorService = {
  async list(ctx: ActorCtx, query: ListVendorsQuery) {
    return vendorRepository.list({ companyId: ctx.companyId, ...query });
  },

  async create(ctx: ActorCtx, input: CreateVendorInput) {
    const vendor = await vendorRepository.create({
      company: { connect: { id: ctx.companyId } },
      name: input.name,
      contactName: input.contactName,
      email: input.email || null,
      phone: input.phone,
      leadTimeDays: input.leadTimeDays ?? 14,
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Vendor",
      entityId: vendor.id,
      action: "CREATE",
      after: vendor,
    });

    return vendor;
  },
};
