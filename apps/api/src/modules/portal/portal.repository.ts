import { Prisma, TicketPriority } from "@prisma/client";
import { prisma } from "../../config/prisma";

/**
 * Every method here takes (companyId, customerId) and ANDs both into the
 * where clause — this is the entire security boundary for the customer
 * portal. Deliberately not reusing the internal modules' repositories
 * (which scope by companyId only) so the portal's extra customerId
 * constraint is impossible to accidentally drop in a future edit.
 */
export const portalRepository = {
  listQuotations(companyId: string, customerId: string) {
    return prisma.quotation.findMany({
      where: { companyId, customerId },
      include: { opportunity: { select: { id: true, code: true, title: true } }, lineItems: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
  },

  findQuotation(companyId: string, customerId: string, id: string) {
    return prisma.quotation.findFirst({
      where: { id, companyId, customerId },
      include: { opportunity: { select: { id: true, code: true, title: true } }, lineItems: { orderBy: { sortOrder: "asc" } } },
    });
  },

  listPurchaseOrders(companyId: string, customerId: string) {
    return prisma.customerPO.findMany({
      where: { companyId, customerId },
      include: { quotation: { select: { id: true, code: true, grandTotal: true, currency: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  findPurchaseOrder(companyId: string, customerId: string, id: string) {
    return prisma.customerPO.findFirst({
      where: { id, companyId, customerId },
      include: {
        quotation: { select: { id: true, code: true, grandTotal: true, currency: true } },
        salesOrder: { select: { id: true, code: true, status: true } },
      },
    });
  },

  listProjects(companyId: string, customerId: string) {
    return prisma.project.findMany({
      where: { companyId, customerId },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
        milestones: { orderBy: { id: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  findProject(companyId: string, customerId: string, id: string) {
    return prisma.project.findFirst({
      where: { id, companyId, customerId },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
        milestones: { orderBy: { id: "asc" } },
        site: { select: { id: true, label: true, city: true, country: true } },
      },
    });
  },

  listInvoices(companyId: string, customerId: string) {
    return prisma.invoice.findMany({
      where: { companyId, customerId },
      include: { payments: { orderBy: { receivedAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    });
  },

  findInvoice(companyId: string, customerId: string, id: string) {
    return prisma.invoice.findFirst({
      where: { id, companyId, customerId },
      include: { lineItems: true, payments: { orderBy: { receivedAt: "desc" } } },
    });
  },

  listTickets(companyId: string, customerId: string) {
    return prisma.ticket.findMany({
      where: { companyId, customerId },
      include: { assignee: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  findTicket(companyId: string, customerId: string, id: string) {
    return prisma.ticket.findFirst({
      where: { id, companyId, customerId },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        // Internal-only comments never leave the building.
        comments: { where: { isInternal: false }, orderBy: { createdAt: "asc" } },
      },
    });
  },

  findSlaPolicy(companyId: string, priority: TicketPriority) {
    return prisma.slaPolicy.findFirst({ where: { companyId, priority } });
  },

  createTicket(data: Prisma.TicketCreateInput) {
    return prisma.ticket.create({ data });
  },

  addComment(data: Prisma.TicketCommentCreateInput) {
    return prisma.ticketComment.create({ data });
  },

  async accountOverview(companyId: string, customerId: string) {
    const [customer, quotations, invoices, projects, tickets, coordinator, primaryContact] = await Promise.all([
      prisma.customer.findFirst({
        where: { id: customerId, companyId },
        select: { id: true, name: true, code: true },
      }),
      prisma.quotation.count({ where: { companyId, customerId, status: { in: ["SENT", "PENDING_APPROVAL"] } } }),
      prisma.invoice.count({
        where: { companyId, customerId, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
      }),
      prisma.project.count({ where: { companyId, customerId, status: { not: "CLOSED" } } }),
      prisma.ticket.count({ where: { companyId, customerId, status: { notIn: ["CLOSED", "RESOLVED"] } } }),
      prisma.user.findFirst({
        where: { companyId, status: "ACTIVE", role: { key: "SALES_COORDINATOR" } },
        select: { firstName: true, lastName: true, email: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.contact.findFirst({
        where: { customerId, isPrimary: true },
        select: { email: true, phone: true },
      }),
    ]);
    return {
      customer: customer
        ? {
            ...customer,
            email: primaryContact?.email ?? null,
            phone: primaryContact?.phone ?? null,
          }
        : null,
      openQuotations: quotations,
      openInvoices: invoices,
      activeProjects: projects,
      openTickets: tickets,
      coordinator: coordinator
        ? {
            name: `${coordinator.firstName} ${coordinator.lastName}`,
            email: coordinator.email,
          }
        : null,
    };
  },
};
