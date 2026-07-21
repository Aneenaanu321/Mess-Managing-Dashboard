import { OpportunityStage, InvoiceStatus, TicketStatus, AmcStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface Ctx {
  companyId: string;
}

export interface ExecutiveSummary {
  leadCount: number;
  openOpportunityCount: number;
  pipelineValue: number;
  quotationCount: number;
  openProjectCount: number;
  openTicketCount: number;
  overdueInvoiceCount: number;
  amcExpiringSoonCount: number;
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
 */
export const dashboardService = {
  async getExecutiveSummary(ctx: Ctx): Promise<ExecutiveSummary> {
    const { companyId } = ctx;
    const now = new Date();
    const amcWindowEnd = new Date(now.getTime() + AMC_EXPIRING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [
      leadCount,
      openOpportunityCount,
      pipelineAgg,
      quotationCount,
      openProjectCount,
      openTicketCount,
      overdueInvoiceCount,
      amcExpiringSoonCount,
    ] = await Promise.all([
      prisma.lead.count({ where: { companyId } }),
      prisma.opportunity.count({ where: { companyId, stage: { notIn: CLOSED_OPPORTUNITY_STAGES } } }),
      prisma.opportunity.aggregate({
        where: { companyId, stage: { notIn: CLOSED_OPPORTUNITY_STAGES } },
        _sum: { estimatedValue: true },
      }),
      prisma.quotation.count({ where: { companyId } }),
      prisma.project.count({ where: { companyId, status: { not: "CLOSED" } } }),
      prisma.ticket.count({ where: { companyId, status: { notIn: CLOSED_TICKET_STATUSES } } }),
      prisma.invoice.count({
        where: { companyId, status: { in: OPEN_INVOICE_STATUSES }, dueDate: { lt: now } },
      }),
      prisma.amcContract.count({
        where: { companyId, status: { in: ACTIVE_AMC_STATUSES }, endDate: { gte: now, lte: amcWindowEnd } },
      }),
    ]);

    return {
      leadCount,
      openOpportunityCount,
      pipelineValue: Number(pipelineAgg._sum.estimatedValue ?? 0),
      quotationCount,
      openProjectCount,
      openTicketCount,
      overdueInvoiceCount,
      amcExpiringSoonCount,
    };
  },
};
