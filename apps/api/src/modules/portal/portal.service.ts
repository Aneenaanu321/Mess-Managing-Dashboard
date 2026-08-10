import { portalRepository } from "./portal.repository";
import { CreatePortalTicketInput, CreatePortalTicketCommentInput, PortalSignOffInput } from "./portal.validation";
import { ApiError } from "../../utils/ApiError";
import { nextNumber } from "../../utils/numberSequence";
import { writeAuditLog } from "../../utils/audit";
import { prisma } from "../../config/prisma";
import { taskService } from "../tasks/task.service";

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

  accountOverview: (ctx: PortalCtx) => portalRepository.accountOverview(ctx.companyId, ctx.customerId),

  async getTicket(ctx: PortalCtx, id: string) {
    const ticket = await portalRepository.findTicket(ctx.companyId, ctx.customerId, id);
    if (!ticket) throw ApiError.notFound("Ticket not found");
    return ticket;
  },

  /** Open field jobs linked to this customer that still need digital sign-off. */
  async listJobsNeedingSignOff(ctx: PortalCtx) {
    const jobs = await prisma.engineerTask.findMany({
      where: {
        companyId: ctx.companyId,
        status: { in: ["TODO", "SEEN", "IN_PROGRESS", "SUBMITTED"] },
        OR: [
          { invoice: { customerId: ctx.customerId } },
          { salesOrder: { customerId: ctx.customerId } },
          { customerPo: { customerId: ctx.customerId } },
          { project: { customerId: ctx.customerId } },
        ],
      },
      select: {
        id: true,
        title: true,
        jobType: true,
        status: true,
        dueDate: true,
        customerSignOff: true,
        invoice: { select: { id: true, code: true } },
        salesOrder: { select: { id: true, code: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 50,
    });
    return jobs.filter((j) => j.customerSignOff == null);
  },

  async signOffJob(ctx: PortalCtx, taskId: string, input: PortalSignOffInput) {
    const task = await prisma.engineerTask.findFirst({
      where: {
        id: taskId,
        companyId: ctx.companyId,
        OR: [
          { invoice: { customerId: ctx.customerId } },
          { salesOrder: { customerId: ctx.customerId } },
          { customerPo: { customerId: ctx.customerId } },
          { project: { customerId: ctx.customerId } },
        ],
      },
      select: { id: true },
    });
    if (!task) throw ApiError.notFound("Job not found");

    return taskService.signOff(
      { companyId: ctx.companyId, branchId: null, userId: ctx.userId },
      taskId,
      input,
      "PORTAL",
    );
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

    return portalRepository.addComment({
      ticket: { connect: { id: ticketId } },
      body: input.body,
      isInternal: false,
      authorId: ctx.userId,
    });
  },
};
