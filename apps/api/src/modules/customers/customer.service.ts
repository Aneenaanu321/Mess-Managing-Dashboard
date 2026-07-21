import { customerRepository } from "./customer.repository";
import { CreateCustomerInput, UpdateCustomerInput } from "./customer.validation";
import { ApiError } from "../../utils/ApiError";
import { nextNumber } from "../../utils/numberSequence";
import { writeAuditLog } from "../../utils/audit";
import { prisma } from "../../config/prisma";

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

  /**
   * US-2.1 AC: de-duplication tool, Super Admin/Sales Manager only, fully
   * audit-logged. Reassigns every child record (contacts, sites,
   * opportunities, quotations, POs, sales orders, projects, invoices,
   * tickets, AMC contracts, activities) from the duplicate onto the
   * surviving customer, then deletes the now-empty duplicate. Left as
   * separate updateMany calls (not a raw SQL sweep) so a model this misses
   * makes the final delete fail loudly on a FK constraint rather than
   * silently losing data.
   */
  async merge(ctx: ActorCtx, sourceId: string, targetId: string) {
    if (sourceId === targetId) throw ApiError.badRequest("Cannot merge a customer into itself");

    const [source, target] = await Promise.all([
      customerRepository.findById(ctx.companyId, sourceId),
      customerRepository.findById(ctx.companyId, targetId),
    ]);
    if (!source) throw ApiError.notFound("Source customer not found");
    if (!target) throw ApiError.notFound("Target customer not found");

    await prisma.$transaction([
      prisma.contact.updateMany({ where: { customerId: sourceId }, data: { customerId: targetId } }),
      prisma.site.updateMany({ where: { customerId: sourceId }, data: { customerId: targetId } }),
      prisma.opportunity.updateMany({ where: { customerId: sourceId }, data: { customerId: targetId } }),
      prisma.quotation.updateMany({ where: { customerId: sourceId }, data: { customerId: targetId } }),
      prisma.customerPO.updateMany({ where: { customerId: sourceId }, data: { customerId: targetId } }),
      prisma.salesOrder.updateMany({ where: { customerId: sourceId }, data: { customerId: targetId } }),
      prisma.project.updateMany({ where: { customerId: sourceId }, data: { customerId: targetId } }),
      prisma.invoice.updateMany({ where: { customerId: sourceId }, data: { customerId: targetId } }),
      prisma.ticket.updateMany({ where: { customerId: sourceId }, data: { customerId: targetId } }),
      prisma.amcContract.updateMany({ where: { customerId: sourceId }, data: { customerId: targetId } }),
      prisma.activity.updateMany({ where: { customerId: sourceId }, data: { customerId: targetId } }),
      prisma.customer.delete({ where: { id: sourceId } }),
    ]);

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Customer",
      entityId: targetId,
      action: "MERGE",
      before: { sourceId, sourceCode: source.code, sourceName: source.name },
      after: { mergedInto: targetId, targetCode: target.code },
    });

    return customerRepository.findById(ctx.companyId, targetId);
  },
};
