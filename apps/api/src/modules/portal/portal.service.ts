import { portalRepository } from "./portal.repository";
import { CreatePortalTicketInput, CreatePortalTicketCommentInput } from "./portal.validation";
import { ApiError } from "../../utils/ApiError";
import { nextNumber } from "../../utils/numberSequence";
import { writeAuditLog } from "../../utils/audit";

interface PortalCtx {
  companyId: string;
  customerId: string;
  userId: string;
}

export const portalService = {
  listQuotations: (ctx: PortalCtx) => portalRepository.listQuotations(ctx.companyId, ctx.customerId),

  async getQuotation(ctx: PortalCtx, id: string) {
    const quotation = await portalRepository.findQuotation(ctx.companyId, ctx.customerId, id);
    if (!quotation) throw ApiError.notFound("Quotation not found");
    return quotation;
  },

  listPurchaseOrders: (ctx: PortalCtx) => portalRepository.listPurchaseOrders(ctx.companyId, ctx.customerId),

  async getPurchaseOrder(ctx: PortalCtx, id: string) {
    const po = await portalRepository.findPurchaseOrder(ctx.companyId, ctx.customerId, id);
    if (!po) throw ApiError.notFound("Purchase order not found");
    return po;
  },

  listProjects: (ctx: PortalCtx) => portalRepository.listProjects(ctx.companyId, ctx.customerId),

  async getProject(ctx: PortalCtx, id: string) {
    const project = await portalRepository.findProject(ctx.companyId, ctx.customerId, id);
    if (!project) throw ApiError.notFound("Project not found");
    return project;
  },

  listInvoices: (ctx: PortalCtx) => portalRepository.listInvoices(ctx.companyId, ctx.customerId),

  async getInvoice(ctx: PortalCtx, id: string) {
    const invoice = await portalRepository.findInvoice(ctx.companyId, ctx.customerId, id);
    if (!invoice) throw ApiError.notFound("Invoice not found");
    return invoice;
  },

  listTickets: (ctx: PortalCtx) => portalRepository.listTickets(ctx.companyId, ctx.customerId),

  async getTicket(ctx: PortalCtx, id: string) {
    const ticket = await portalRepository.findTicket(ctx.companyId, ctx.customerId, id);
    if (!ticket) throw ApiError.notFound("Ticket not found");
    return ticket;
  },

  async createTicket(ctx: PortalCtx, input: CreatePortalTicketInput) {
    const code = await nextNumber(ctx.companyId, "TICKET", "TKT");
    const policy = await portalRepository.findSlaPolicy(ctx.companyId, input.priority);
    const now = Date.now();

    const ticket = await portalRepository.createTicket({
      companyId: ctx.companyId,
      code,
      customer: { connect: { id: ctx.customerId } },
      ...(input.deviceId ? { device: { connect: { id: input.deviceId } } } : {}),
      subject: input.subject,
      description: input.description,
      priority: input.priority,
      raisedBy: { connect: { id: ctx.userId } },
      ...(policy
        ? {
            slaResponseDueAt: new Date(now + policy.responseMins * 60_000),
            slaResolutionDueAt: new Date(now + policy.resolutionMins * 60_000),
          }
        : {}),
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Ticket",
      entityId: ticket.id,
      action: "CREATE_VIA_PORTAL",
      after: ticket,
    });

    return ticket;
  },

  async addTicketComment(ctx: PortalCtx, ticketId: string, input: CreatePortalTicketCommentInput) {
    const ticket = await portalRepository.findTicket(ctx.companyId, ctx.customerId, ticketId);
    if (!ticket) throw ApiError.notFound("Ticket not found");

    // A portal user's own comment is, by definition, never internal-only.
    return portalRepository.addComment({
      ticket: { connect: { id: ticketId } },
      body: input.body,
      isInternal: false,
      authorId: ctx.userId,
    });
  },
};
