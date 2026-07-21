import { LeadStatus, OpportunityStage } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { dashboardService, ExecutiveSummary } from "../dashboard/dashboard.service";

interface Ctx {
  companyId: string;
}

export interface ReportsSummary {
  leadFunnel: { status: LeadStatus; count: number }[];
  opportunityByStage: { stage: OpportunityStage; count: number; value: number }[];
  revenue: { paidInvoices: number; wonOpportunities: number; total: number };
  collections: { total: number; byMonth: { month: string; amount: number }[] };
}

export const reportsService = {
  /** Same KPI set as the Executive Dashboard — exposed here too under /reports/executive. */
  getExecutiveSummary(ctx: Ctx): Promise<ExecutiveSummary> {
    return dashboardService.getExecutiveSummary(ctx);
  },

  async getSummary(ctx: Ctx): Promise<ReportsSummary> {
    const { companyId } = ctx;

    const [leadGroups, oppGroups, paidInvoiceAgg, wonOppAgg, payments] = await Promise.all([
      prisma.lead.groupBy({ by: ["status"], where: { companyId }, _count: { _all: true } }),
      prisma.opportunity.groupBy({
        by: ["stage"],
        where: { companyId },
        _count: { _all: true },
        _sum: { estimatedValue: true },
      }),
      prisma.invoice.aggregate({ where: { companyId, status: "PAID" }, _sum: { totalAmount: true } }),
      prisma.opportunity.aggregate({ where: { companyId, stage: "WON" }, _sum: { estimatedValue: true } }),
      prisma.payment.findMany({ where: { companyId }, select: { amount: true, receivedAt: true } }),
    ]);

    const paidInvoices = Number(paidInvoiceAgg._sum.totalAmount ?? 0);
    const wonOpportunities = Number(wonOppAgg._sum.estimatedValue ?? 0);

    // Grouped in JS rather than a raw SQL date_trunc — payment volumes at v1 scale
    // don't justify the extra query complexity, and this stays portable across DBs.
    const byMonthMap = new Map<string, number>();
    let collectionsTotal = 0;
    for (const payment of payments) {
      const amount = Number(payment.amount);
      collectionsTotal += amount;
      const month = payment.receivedAt.toISOString().slice(0, 7); // YYYY-MM
      byMonthMap.set(month, (byMonthMap.get(month) ?? 0) + amount);
    }
    const byMonth = Array.from(byMonthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }));

    return {
      leadFunnel: leadGroups.map((g) => ({ status: g.status, count: g._count._all })),
      opportunityByStage: oppGroups.map((g) => ({
        stage: g.stage,
        count: g._count._all,
        value: Number(g._sum.estimatedValue ?? 0),
      })),
      revenue: { paidInvoices, wonOpportunities, total: paidInvoices + wonOpportunities },
      collections: { total: collectionsTotal, byMonth },
    };
  },
};
