import { LeadStatus, OpportunityStage } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { dashboardService, ExecutiveSummary } from "../dashboard/dashboard.service";

interface Ctx {
  companyId: string;
  branchId?: string;
}

export interface ReportsSummary {
  leadFunnel: { status: LeadStatus; count: number }[];
  opportunityByStage: { stage: OpportunityStage; count: number; value: number }[];
  revenue: { paidInvoices: number; wonOpportunities: number; total: number };
  collections: { total: number; byMonth: { month: string; amount: number }[] };
}

export type AgingBucket = "CURRENT" | "DAYS_1_30" | "DAYS_31_60" | "DAYS_61_90" | "DAYS_90_PLUS";

export interface ReceivablesAging {
  buckets: Record<AgingBucket, number>;
  invoices: {
    id: string;
    code: string;
    customerName: string;
    currency: string;
    balance: number;
    dueDate: string;
    daysOverdue: number;
    bucket: AgingBucket;
  }[];
}

function agingBucket(daysOverdue: number): AgingBucket {
  if (daysOverdue <= 0) return "CURRENT";
  if (daysOverdue <= 30) return "DAYS_1_30";
  if (daysOverdue <= 60) return "DAYS_31_60";
  if (daysOverdue <= 90) return "DAYS_61_90";
  return "DAYS_90_PLUS";
}

export const reportsService = {
  /** Same KPI set as the Executive Dashboard — exposed here too under /reports/executive. */
  getExecutiveSummary(ctx: Ctx): Promise<ExecutiveSummary> {
    return dashboardService.getExecutiveSummary(ctx);
  },

  async getSummary(ctx: Ctx): Promise<ReportsSummary> {
    const { companyId, branchId } = ctx;
    const branchFilter = branchId ? { branchId } : {};

    const [leadGroups, oppGroups, paidInvoiceAgg, wonOppAgg, payments] = await Promise.all([
      prisma.lead.groupBy({ by: ["status"], where: { companyId, ...branchFilter }, _count: { _all: true } }),
      prisma.opportunity.groupBy({
        by: ["stage"],
        where: { companyId, ...branchFilter },
        _count: { _all: true },
        _sum: { estimatedValue: true },
      }),
      prisma.invoice.aggregate({ where: { companyId, ...branchFilter, status: "PAID" }, _sum: { totalAmount: true } }),
      prisma.opportunity.aggregate({ where: { companyId, ...branchFilter, stage: "WON" }, _sum: { estimatedValue: true } }),
      // Payment has no branchId of its own — filtered via its Invoice's branch instead.
      prisma.payment.findMany({
        where: { companyId, ...(branchId ? { invoice: { branchId } } : {}) },
        select: { amount: true, receivedAt: true },
      }),
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

  /** US-7.2: outstanding-balance buckets for unpaid invoices, oldest-first. */
  async getReceivablesAging(ctx: Ctx): Promise<ReceivablesAging> {
    const { companyId, branchId } = ctx;
    const now = new Date();

    const unpaid = await prisma.invoice.findMany({
      where: { companyId, ...(branchId ? { branchId } : {}), status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
      include: { customer: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    });

    const buckets: Record<AgingBucket, number> = {
      CURRENT: 0,
      DAYS_1_30: 0,
      DAYS_31_60: 0,
      DAYS_61_90: 0,
      DAYS_90_PLUS: 0,
    };

    const invoices = unpaid
      .map((inv) => {
        const balance = Number(inv.totalAmount) - Number(inv.amountPaid);
        const daysOverdue = Math.floor((now.getTime() - inv.dueDate.getTime()) / (24 * 60 * 60 * 1000));
        const bucket = agingBucket(daysOverdue);
        buckets[bucket] += balance;
        return {
          id: inv.id,
          code: inv.code,
          customerName: inv.customer.name,
          currency: inv.currency,
          balance,
          dueDate: inv.dueDate.toISOString(),
          daysOverdue,
          bucket,
        };
      })
      .filter((inv) => inv.balance > 0);

    return { buckets, invoices };
  },
};
