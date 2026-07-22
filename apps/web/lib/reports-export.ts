import { downloadCsv } from "./csv";
import type { AgingBucket, ReceivablesAging, ReportsSummary } from "./reports";

const AGING_BUCKET_LABELS: Record<AgingBucket, string> = {
  CURRENT: "Current",
  DAYS_1_30: "1–30 days",
  DAYS_31_60: "31–60 days",
  DAYS_61_90: "61–90 days",
  DAYS_90_PLUS: "90+ days",
};

function label(value: string) {
  return value.replaceAll("_", " ");
}

type ReportRow = {
  section: string;
  metric: string;
  count: number | string;
  amount: number | string;
  currency: string;
  detail: string;
};

export function downloadReportsExport(
  summary: ReportsSummary | undefined,
  aging: ReceivablesAging | undefined,
  currency: string,
  branchLabel = "All branches",
) {
  const rows: ReportRow[] = [
    { section: "Report Info", metric: "Generated", count: "", amount: "", currency: "", detail: new Date().toLocaleString() },
    { section: "Report Info", metric: "Branch", count: "", amount: "", currency: "", detail: branchLabel },
  ];

  if (summary) {
    rows.push(
      { section: "Revenue", metric: "Paid Invoices", count: "", amount: summary.revenue.paidInvoices, currency, detail: "" },
      { section: "Revenue", metric: "Won Deals", count: "", amount: summary.revenue.wonOpportunities, currency, detail: "" },
      { section: "Revenue", metric: "Total Revenue", count: "", amount: summary.revenue.total, currency, detail: "" },
      { section: "Revenue", metric: "Total Collections", count: "", amount: summary.collections.total, currency, detail: "" },
    );

    for (const row of summary.leadFunnel) {
      rows.push({ section: "Lead Funnel", metric: label(row.status), count: row.count, amount: "", currency: "", detail: "" });
    }

    for (const row of summary.opportunityByStage) {
      rows.push({
        section: "Deal Board",
        metric: label(row.stage),
        count: row.count,
        amount: row.value,
        currency,
        detail: "",
      });
    }

    for (const row of summary.collections.byMonth) {
      rows.push({ section: "Collections by Month", metric: row.month, count: "", amount: row.amount, currency, detail: "" });
    }

    for (const bucket of Object.keys(AGING_BUCKET_LABELS) as AgingBucket[]) {
      rows.push({
        section: "Receivables Summary",
        metric: AGING_BUCKET_LABELS[bucket],
        count: "",
        amount: aging?.buckets[bucket] ?? 0,
        currency,
        detail: "",
      });
    }
  }

  for (const inv of aging?.invoices ?? []) {
    rows.push({
      section: "Receivables Detail",
      metric: inv.code,
      count: inv.daysOverdue,
      amount: inv.balance,
      currency: inv.currency,
      detail: `${inv.customerName} | Due ${new Date(inv.dueDate).toLocaleDateString()} | ${AGING_BUCKET_LABELS[inv.bucket]}`,
    });
  }

  const filename = `sales-report-${new Date().toISOString().slice(0, 10)}`;
  downloadCsv(filename, rows, [
    { key: "section", label: "Section" },
    { key: "metric", label: "Metric" },
    { key: "count", label: "Count" },
    { key: "amount", label: "Amount" },
    { key: "currency", label: "Currency" },
    { key: "detail", label: "Detail" },
  ]);
}
