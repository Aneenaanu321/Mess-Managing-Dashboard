import { Response } from "express";
import { AgingBucket, ReceivablesAging, ReportsSummary } from "./reports.service";
import { createPdf, drawBrandHeader, drawContinuationHeader, drawKeyValueCard, drawSectionLabel, drawTable, finalizePdf, money } from "../../utils/pdf/layout";

interface CompanyView {
  name: string;
  legalName: string | null;
  taxId: string | null;
}

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

/** Streams a branded Sales Report PDF — same data set as the Reports page and its CSV export (revenue, lead funnel, deal board, collections, receivables aging), just laid out for printing/sharing. */
export function streamSalesReportPdf(
  res: Response,
  company: CompanyView,
  currency: string,
  branchLabel: string,
  summary: ReportsSummary,
  aging: ReceivablesAging,
) {
  const companyName = company.legalName || company.name;
  const doc = createPdf(res, "sales-report");

  drawBrandHeader(doc, {
    companyName,
    taxId: company.taxId,
    eyebrow: "Sales Report",
    title: branchLabel,
    subtitle: `Generated ${new Date().toLocaleDateString()}`,
  });

  drawKeyValueCard(
    doc,
    [
      { label: "Paid Invoices", value: money(summary.revenue.paidInvoices, currency) },
      { label: "Won Deals Value", value: money(summary.revenue.wonOpportunities, currency) },
      { label: "Total Revenue", value: money(summary.revenue.total, currency) },
      { label: "Total Collections", value: money(summary.collections.total, currency) },
    ],
    2,
  );

  const continuePage = () => drawContinuationHeader(doc, companyName, "Sales Report");

  drawSectionLabel(doc, "Lead Funnel");
  drawTable(doc, {
    columns: [
      { key: "status", label: "Status", width: 350 },
      { key: "count", label: "Count", width: 145, align: "right" },
    ],
    rows: summary.leadFunnel.map((row) => ({ status: label(row.status), count: String(row.count) })),
    onNewPage: continuePage,
    emptyLabel: "No leads recorded",
  });

  drawSectionLabel(doc, "Opportunities by Stage");
  drawTable(doc, {
    columns: [
      { key: "stage", label: "Stage", width: 220 },
      { key: "count", label: "Count", width: 100, align: "right" },
      { key: "value", label: "Value", width: 175, align: "right" },
    ],
    rows: summary.opportunityByStage.map((row) => ({ stage: label(row.stage), count: String(row.count), value: money(row.value, currency) })),
    onNewPage: continuePage,
    emptyLabel: "No opportunities recorded",
  });

  if (summary.collections.byMonth.length > 0) {
    drawSectionLabel(doc, "Collections by Month");
    drawTable(doc, {
      columns: [
        { key: "month", label: "Month", width: 350 },
        { key: "amount", label: "Amount", width: 145, align: "right" },
      ],
      rows: summary.collections.byMonth.map((row) => ({ month: row.month, amount: money(row.amount, currency) })),
      onNewPage: continuePage,
    });
  }

  drawSectionLabel(doc, "Receivables Aging Summary");
  drawTable(doc, {
    columns: [
      { key: "bucket", label: "Bucket", width: 350 },
      { key: "amount", label: "Outstanding", width: 145, align: "right" },
    ],
    rows: (Object.keys(AGING_BUCKET_LABELS) as AgingBucket[]).map((bucket) => ({
      bucket: AGING_BUCKET_LABELS[bucket],
      amount: money(aging.buckets[bucket], currency),
    })),
    onNewPage: continuePage,
  });

  drawSectionLabel(doc, "Receivables Detail");
  drawTable(doc, {
    columns: [
      { key: "code", label: "Invoice", width: 80 },
      { key: "customer", label: "Customer", width: 150 },
      { key: "due", label: "Due Date", width: 75, align: "right" },
      { key: "bucket", label: "Bucket", width: 90, align: "right" },
      { key: "balance", label: "Balance", width: 100, align: "right" },
    ],
    rows: aging.invoices.map((inv) => ({
      code: inv.code,
      customer: inv.customerName,
      due: new Date(inv.dueDate).toLocaleDateString(),
      bucket: AGING_BUCKET_LABELS[inv.bucket],
      balance: money(inv.balance, inv.currency),
    })),
    onNewPage: continuePage,
    emptyLabel: "No outstanding receivables",
  });

  finalizePdf(doc, companyName);
}
