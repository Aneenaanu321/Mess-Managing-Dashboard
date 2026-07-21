import { LeadStatus, OpportunityStage, InvoiceStatus, TicketStatus, AmcStatus, TicketPriority } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface Ctx {
  companyId: string;
}

const STALE_OPPORTUNITY_DAYS = 14;
const AMC_WINDOW_DAYS = 90;

const OPEN_LEAD_STATUSES_EXCLUDED: LeadStatus[] = ["DISQUALIFIED", "CONVERTED"];
const CLOSED_OPPORTUNITY_STAGES: OpportunityStage[] = ["WON", "LOST"];
const OPEN_INVOICE_STATUSES: InvoiceStatus[] = ["SENT", "PARTIALLY_PAID", "OVERDUE"];
const CLOSED_TICKET_STATUSES: TicketStatus[] = ["RESOLVED", "CLOSED"];
const ACTIVE_AMC_STATUSES: AmcStatus[] = ["ACTIVE", "EXPIRING_SOON"];

interface AdvisorySnapshot {
  unassignedLeadCount: number;
  openOpportunityCount: number;
  staleOpportunityCount: number;
  pipelineValue: number;
  expiringAmcCount: number;
  overdueInvoiceCount: number;
  overdueInvoiceAmount: number;
  openTicketCount: number;
  criticalTicketCount: number;
}

async function buildSnapshot(companyId: string): Promise<AdvisorySnapshot> {
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - STALE_OPPORTUNITY_DAYS * 24 * 60 * 60 * 1000);
  const amcWindowEnd = new Date(now.getTime() + AMC_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [
    unassignedLeadCount,
    openOpportunityCount,
    staleOpportunityCount,
    pipelineAgg,
    expiringAmcCount,
    overdueInvoices,
    openTicketCount,
    criticalTicketCount,
  ] = await Promise.all([
    prisma.lead.count({ where: { companyId, ownerId: null, status: { notIn: OPEN_LEAD_STATUSES_EXCLUDED } } }),
    prisma.opportunity.count({ where: { companyId, stage: { notIn: CLOSED_OPPORTUNITY_STAGES } } }),
    prisma.opportunity.count({
      where: { companyId, stage: { notIn: CLOSED_OPPORTUNITY_STAGES }, updatedAt: { lt: staleCutoff } },
    }),
    prisma.opportunity.aggregate({
      where: { companyId, stage: { notIn: CLOSED_OPPORTUNITY_STAGES } },
      _sum: { estimatedValue: true },
    }),
    prisma.amcContract.count({
      where: { companyId, status: { in: ACTIVE_AMC_STATUSES }, endDate: { gte: now, lte: amcWindowEnd } },
    }),
    prisma.invoice.findMany({
      where: { companyId, status: { in: OPEN_INVOICE_STATUSES }, dueDate: { lt: now } },
      select: { totalAmount: true, amountPaid: true },
    }),
    prisma.ticket.count({ where: { companyId, status: { notIn: CLOSED_TICKET_STATUSES } } }),
    prisma.ticket.count({
      where: { companyId, priority: TicketPriority.CRITICAL, status: { notIn: CLOSED_TICKET_STATUSES } },
    }),
  ]);

  const overdueInvoiceAmount = overdueInvoices.reduce(
    (sum, inv) => sum + (Number(inv.totalAmount) - Number(inv.amountPaid)),
    0,
  );

  return {
    unassignedLeadCount,
    openOpportunityCount,
    staleOpportunityCount,
    pipelineValue: Number(pipelineAgg._sum.estimatedValue ?? 0),
    expiringAmcCount,
    overdueInvoiceCount: overdueInvoices.length,
    overdueInvoiceAmount,
    openTicketCount,
    criticalTicketCount,
  };
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

type Topic = { test: RegExp; reply: (s: AdvisorySnapshot) => string };

const TOPICS: Topic[] = [
  {
    test: /lead/i,
    reply: (s) =>
      s.unassignedLeadCount > 0
        ? `You have ${s.unassignedLeadCount} unassigned lead${s.unassignedLeadCount === 1 ? "" : "s"} sitting without an owner. Assign them quickly — response time strongly correlates with conversion.`
        : `Good news — every open lead currently has an owner. Keep an eye on new inbound leads so they get assigned within 24h.`,
  },
  {
    test: /(opportunit|pipeline|deal)/i,
    reply: (s) =>
      `Your open pipeline holds ${s.openOpportunityCount} opportunit${s.openOpportunityCount === 1 ? "y" : "ies"} worth ~${formatCurrency(s.pipelineValue)}. ` +
      (s.staleOpportunityCount > 0
        ? `${s.staleOpportunityCount} of them haven't moved stage in over ${STALE_OPPORTUNITY_DAYS} days — worth a follow-up before they go cold.`
        : `Nothing looks stale right now — good momentum.`),
  },
  {
    test: /(amc|contract|renew)/i,
    reply: (s) =>
      s.expiringAmcCount > 0
        ? `${s.expiringAmcCount} AMC contract${s.expiringAmcCount === 1 ? "" : "s"} expire within the next ${AMC_WINDOW_DAYS} days. Start renewal outreach now to avoid a lapse.`
        : `No AMC contracts are expiring in the next ${AMC_WINDOW_DAYS} days.`,
  },
  {
    test: /(invoice|overdue|payment|collection|receivable)/i,
    reply: (s) =>
      s.overdueInvoiceCount > 0
        ? `${s.overdueInvoiceCount} invoice${s.overdueInvoiceCount === 1 ? "" : "s"} are overdue, totalling ~${formatCurrency(s.overdueInvoiceAmount)} outstanding. Consider prioritizing collections on the largest balances first.`
        : `No overdue invoices right now — collections are current.`,
  },
  {
    test: /(ticket|support|issue)/i,
    reply: (s) =>
      s.openTicketCount > 0
        ? `There are ${s.openTicketCount} open support ticket${s.openTicketCount === 1 ? "" : "s"}${s.criticalTicketCount > 0 ? `, including ${s.criticalTicketCount} marked CRITICAL — those need immediate attention.` : "."}`
        : `No open support tickets — the support queue is clear.`,
  },
];

/**
 * Rule-based advisory "AI" — deliberately no LLM dependency so the assistant
 * works without an Anthropic/OpenAI key. Keyword-matches the message against
 * known topics and reports live DB counts plus a short recommendation.
 * Advisory-only: it only ever reads data, never mutates anything.
 */
function composeReply(message: string, snapshot: AdvisorySnapshot): string {
  const matched = TOPICS.filter((t) => t.test.test(message));
  if (matched.length > 0) {
    return matched.map((t) => t.reply(snapshot)).join(" ");
  }

  const lines: string[] = [`Here's a quick snapshot of what needs attention:`];
  if (snapshot.unassignedLeadCount > 0) lines.push(`• ${snapshot.unassignedLeadCount} unassigned lead(s).`);
  if (snapshot.staleOpportunityCount > 0) {
    lines.push(`• ${snapshot.staleOpportunityCount} stale opportunity(ies) with no stage movement in ${STALE_OPPORTUNITY_DAYS}+ days.`);
  }
  if (snapshot.expiringAmcCount > 0) lines.push(`• ${snapshot.expiringAmcCount} AMC contract(s) expiring within ${AMC_WINDOW_DAYS} days.`);
  if (snapshot.overdueInvoiceCount > 0) {
    lines.push(`• ${snapshot.overdueInvoiceCount} overdue invoice(s), ~${formatCurrency(snapshot.overdueInvoiceAmount)} outstanding.`);
  }
  if (snapshot.criticalTicketCount > 0) lines.push(`• ${snapshot.criticalTicketCount} CRITICAL support ticket(s) open.`);
  if (lines.length === 1) lines.push(`Everything looks healthy — no urgent risk items right now.`);
  lines.push(`Ask me about leads, pipeline, AMC contracts, invoices, or tickets for more detail.`);
  return lines.join("\n");
}

export const aiService = {
  async chat(ctx: Ctx, message: string) {
    const snapshot = await buildSnapshot(ctx.companyId);
    return { reply: composeReply(message, snapshot) };
  },
};
