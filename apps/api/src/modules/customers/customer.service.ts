import { customerRepository } from "./customer.repository";
import { CreateCustomerInput, UpdateCustomerInput } from "./customer.validation";
import { ApiError } from "../../utils/ApiError";
import { nextNumber } from "../../utils/numberSequence";
import { writeAuditLog } from "../../utils/audit";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

export const customerService = {
  async list(ctx: ActorCtx, query: { industry?: any; search?: string; page: number; pageSize: number }) {
    return customerRepository.list({ companyId: ctx.companyId, ...query });
  },

  async getById(ctx: ActorCtx, id: string) {
    const customer = await customerRepository.findById(ctx.companyId, id);
    if (!customer) throw ApiError.notFound("Customer not found");
    return customer;
  },

  async create(ctx: ActorCtx, input: CreateCustomerInput) {
    // Key intentionally matches the "CUSTOMER"/"CUST" sequence the lead-conversion flow
    // already uses (see lead.service#convert) so directly-created and converted-from-lead
    // customers share one counter and never collide on the same CUST-<year>-<n> code.
    const code = await nextNumber(ctx.companyId, "CUSTOMER", "CUST");

    const customer = await customerRepository.create({
      company: { connect: { id: ctx.companyId } },
      branchId: ctx.branchId,
      code,
      name: input.name,
      industry: input.industry,
      website: input.website || null,
      taxId: input.taxId || null,
      ...(input.ownerId ? { owner: { connect: { id: input.ownerId } } } : {}),
      contacts: input.primaryContact
        ? {
            create: [
              {
                firstName: input.primaryContact.firstName,
                lastName: input.primaryContact.lastName,
                email: input.primaryContact.email || null,
                phone: input.primaryContact.phone || null,
                isPrimary: true,
              },
            ],
          }
        : undefined,
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Customer",
      entityId: customer.id,
      action: "CREATE",
      after: customer,
    });

    return customer;
  },

  async update(ctx: ActorCtx, id: string, input: UpdateCustomerInput) {
    const existing = await customerRepository.findById(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Customer not found");

    const updated = await customerRepository.update(id, {
      ...input,
      website: input.website === "" ? null : input.website,
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Customer",
      entityId: id,
      action: "UPDATE",
      before: existing,
      after: updated,
    });

    return updated;
  },
};
