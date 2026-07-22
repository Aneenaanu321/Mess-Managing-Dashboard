import { OpportunityStage, InvoiceStatus, TicketStatus, AmcStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface Ctx {
  companyId: string;
  branchId?: string;
  userId?: string;
}

export interface ExecutiveSummary {
  leadCount: number;
  unassignedLeadCount: number;
  newLeadCount7d: number;
  openOpportunityCount: number;
  pipelineValue: number;
  wonOpportunityCount: number;
  quotationCount: number;
  pendingApprovalCount: number;
  openProjectCount: number;
  openTicketCount: number;
  overdueInvoiceCount: number;
  amcExpiringSoonCount: number;
  upcomingEventCount: number;
}

export interface DashboardSpotlight {
  recentLeads: Array<{
    id: string;
    code: string;
    companyName: string;
    contactName: string;
    status: string;
    score: number;
    createdAt: Date;
  }>;
  topOpportunities: Array<{
    id: string;
    code: string;
    title: string;
    stage: string;
    estimatedValue: number;
    currency: string;
    customerName: string | null;
  }>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    type: string;
    startAt: Date;
    opportunityCode: string | null;
  }>;
  pendingApprovals: Array<{
    id: string;
    reason: string | null;
    requestedAt: Date;
    quotationCode: string | null;
    customerName: string | null;
    grandTotal: number | null;
    currency: string | null;
  }>;
  expiringAmcs: Array<{
    id: string;
    code: string;
    customerName: string | null;
    endDate: Date;
    contractValue: number;
    currency: string;
    daysToExpiry: number;
  }>;
}

const CLOSED_OPPORTUNITY_STAGES: OpportunityStage[] = ["WON", "LOST"];
const OPEN_INVOICE_STATUSES: InvoiceStatus[] = ["SENT", "PARTIALLY_PAID", "OVERDUE"];
const CLOSED_TICKET_STATUSES: TicketStatus[] = ["RESOLVED", "CLOSED"];
const ACTIVE_AMC_STATUSES: AmcStatus[] = ["ACTIVE", "EXPIRING_SOON"];
const AMC_EXPIRING_WINDOW_DAYS = 90;

/**
 * Executive KPI aggregation. Every query is scoped to companyId (never
 * trusts a client-supplied value — see authenticate.ts) and reads directly
 * off the primary tables rather than a denormalized snapshot, since v1
 * data volumes don't yet warrant a materialized reporting table.
 *
 * Optional branchId narrows every count to one branch — PRD §9 requires the
 * data model to support multi-branch from day one "even if UI for switching
 * is basic in v1"; this is that basic switching, scoped to the two screens
 * (Dashboard, Reports) where slicing by branch actually matters. It's a
 * report filter, not a change to who can see what — RBAC/companyId scoping
 * is unaffected.
 */
export const dashboardService = {
  async getExecutiveSummary(ctx: Ctx): Promise<ExecutiveSummary> {
    const { companyId, branchId } = ctx;
    const branchFilter = branchId ? { branchId } : {};
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const amcWindowEnd = new Date(now.getTime() + AMC_EXPIRING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [
      leadCount,
      unassignedLeadCount,
      newLeadCount7d,
      openOpportunityCount,
      pipelineAgg,
      wonOpportunityCount,
      quotationCount,
      pendingApprovalCount,
      openProjectCount,
      openTicketCount,
      overdueInvoiceCount,
      amcExpiringSoonCount,
      upcomingEventCount,
    ] = await Promise.all([
      prisma.lead.count({ where: { companyId, ...branchFilter } }),
      prisma.lead.count({
        where: { companyId, ...branchFilter, ownerId: null, status: { in: ["NEW", "CONTACTED", "QUALIFIED"] } },
      }),
      prisma.lead.count({ where: { companyId, ...branchFilter, createdAt: { gte: sevenDaysAgo } } }),
      prisma.opportunity.count({ where: { companyId, ...branchFilter, stage: { notIn: CLOSED_OPPORTUNITY_STAGES } } }),
      prisma.opportunity.aggregate({
        where: { companyId, ...branchFilter, stage: { notIn: CLOSED_OPPORTUNITY_STAGES } },
        _sum: { estimatedValue: true },
      }),
      prisma.opportunity.count({ where: { companyId, ...branchFilter, stage: "WON" } }),
      prisma.quotation.count({ where: { companyId, ...branchFilter } }),
      prisma.approval.count({ where: { companyId, status: "PENDING" } }),
      prisma.project.count({ where: { companyId, ...branchFilter, status: { not: "CLOSED" } } }),
      prisma.ticket.count({ where: { companyId, ...branchFilter, status: { notIn: CLOSED_TICKET_STATUSES } } }),
      prisma.invoice.count({
        where: { companyId, ...branchFilter, status: { in: OPEN_INVOICE_STATUSES }, dueDate: { lt: now } },
      }),
      prisma.amcContract.count({
        where: { companyId, ...branchFilter, status: { in: ACTIVE_AMC_STATUSES }, endDate: { gte: now, lte: amcWindowEnd } },
      }),
      prisma.calendarEvent.count({
        where: { companyId, completedAt: null, startAt: { gte: now, lte: fourteenDaysAhead } },
      }),
    ]);

    return {
      leadCount,
      unassignedLeadCount,
      newLeadCount7d,
      openOpportunityCount,
      pipelineValue: Number(pipelineAgg._sum.estimatedValue ?? 0),
      wonOpportunityCount,
      quotationCount,
      pendingApprovalCount,
      openProjectCount,
      openTicketCount,
      overdueInvoiceCount,
      amcExpiringSoonCount,
      upcomingEventCount,
    };
  },

  async getSpotlight(ctx: Ctx): Promise<DashboardSpotlight> {
    const { companyId, branchId } = ctx;
    const branchFilter = branchId ? { branchId } : {};
    const now = new Date();
    const fourteenDaysAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const amcWindowEnd = new Date(now.getTime() + AMC_EXPIRING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [recentLeads, topOpportunities, upcomingEvents, pendingApprovals, expiringAmcs] = await Promise.all([
      prisma.lead.findMany({
        where: { companyId, ...branchFilter },
        select: {
          id: true,
          code: true,
          companyName: true,
          contactName: true,
          status: true,
          score: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.opportunity.findMany({
        where: { companyId, ...branchFilter, stage: { notIn: CLOSED_OPPORTUNITY_STAGES } },
        select: {
          id: true,
          code: true,
          title: true,
          stage: true,
          estimatedValue: true,
          currency: true,
          customer: { select: { name: true } },
        },
        orderBy: { estimatedValue: "desc" },
        take: 5,
      }),
      prisma.calendarEvent.findMany({
        where: { companyId, completedAt: null, startAt: { gte: now, lte: fourteenDaysAhead } },
        select: {
          id: true,
          title: true,
          type: true,
          startAt: true,
          opportunity: { select: { code: true } },
        },
        orderBy: { startAt: "asc" },
        take: 5,
      }),
      prisma.approval.findMany({
        where: { companyId, status: "PENDING" },
        select: {
          id: true,
          reason: true,
          requestedAt: true,
          quotation: {
            select: {
              code: true,
              grandTotal: true,
              currency: true,
              customer: { select: { name: true } },
            },
          },
        },
        orderBy: { requestedAt: "asc" },
        take: 5,
      }),
      prisma.amcContract.findMany({
        where: { companyId, ...branchFilter, status: { in: ACTIVE_AMC_STATUSES }, endDate: { gte: now, lte: amcWindowEnd } },
        select: {
          id: true,
          code: true,
          endDate: true,
          contractValue: true,
          currency: true,
          customer: { select: { name: true } },
        },
        orderBy: { endDate: "asc" },
        take: 5,
      }),
    ]);

    return {
      recentLeads,
      topOpportunities: topOpportunities.map((o) => ({
        id: o.id,
        code: o.code,
        title: o.title,
        stage: o.stage,
        estimatedValue: Number(o.estimatedValue),
        currency: o.currency,
        customerName: o.customer?.name ?? null,
      })),
      upcomingEvents: upcomingEvents.map((e) => ({
        id: e.id,
        title: e.title,
        type: e.type,
        startAt: e.startAt,
        opportunityCode: e.opportunity?.code ?? null,
      })),
      pendingApprovals: pendingApprovals.map((a) => ({
        id: a.id,
        reason: a.reason,
        requestedAt: a.requestedAt,
        quotationCode: a.quotation?.code ?? null,
        customerName: a.quotation?.customer?.name ?? null,
        grandTotal: a.quotation ? Number(a.quotation.grandTotal) : null,
        currency: a.quotation?.currency ?? null,
      })),
      expiringAmcs: expiringAmcs.map((c) => ({
        id: c.id,
        code: c.code,
        customerName: c.customer?.name ?? null,
        endDate: c.endDate,
        contractValue: Number(c.contractValue),
        currency: c.currency,
        daysToExpiry: Math.max(0, Math.ceil((c.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))),
      })),
    };
  },
};
