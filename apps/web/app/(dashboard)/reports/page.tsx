"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Download, FileText } from "lucide-react";
import { useCurrentUser } from "@/lib/auth";
import { useReportsSummary, useReceivablesAging, openReportsPdf, AgingBucket } from "@/lib/reports";
import { Badge, Button, Card } from "@/components/ui";
import { downloadCsv } from "@/lib/csv";
import { BranchFilter } from "@/components/BranchFilter";
import { getPageLabel } from "@/lib/nav-labels";
import { downloadReportsExport } from "@/lib/reports-export";
import { toast } from "@/lib/toast";

const ReportsCharts = dynamic(
  () => import("@/components/reports/ReportsCharts").then((m) => m.ReportsCharts),
  {
    ssr: false,
    loading: () => (
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="h-80 animate-pulse bg-slate-100 dark:bg-slate-800" />
        <Card className="h-80 animate-pulse bg-slate-100 dark:bg-slate-800" />
      </div>
    ),
  },
);

const AGING_BUCKET_LABELS: Record<AgingBucket, string> = {
  CURRENT: "Current",
  DAYS_1_30: "1–30 days",
  DAYS_31_60: "31–60 days",
  DAYS_61_90: "61–90 days",
  DAYS_90_PLUS: "90+ days",
};

const AGING_BUCKET_TONE: Record<AgingBucket, "slate" | "amber" | "red"> = {
  CURRENT: "slate",
  DAYS_1_30: "amber",
  DAYS_31_60: "amber",
  DAYS_61_90: "red",
  DAYS_90_PLUS: "red",
};

function label(value: string) {
  return value.replaceAll("_", " ");
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export default function ReportsPage() {
  const { data: user } = useCurrentUser();
  const [branchId, setBranchId] = useState("");
  const { data, isLoading, isError } = useReportsSummary(branchId || undefined);
  const { data: aging, isLoading: agingLoading } = useReceivablesAging(branchId || undefined);
  const currency = user?.company?.currency ?? "AED";

  const leadFunnel = (data?.leadFunnel ?? []).map((row) => ({ ...row, name: label(row.status) }));
  const opportunityByStage = (data?.opportunityByStage ?? []).map((row) => ({ ...row, name: label(row.stage) }));
  const collectionsByMonth = data?.collections.byMonth ?? [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-primary">{getPageLabel("/reports")}</h1>
          <p className="text-sm text-muted">Funnel, pipeline, revenue and collections at a glance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            disabled={isLoading || agingLoading || isError}
            onClick={() => {
              downloadReportsExport(data, aging, currency, branchId ? `Branch ${branchId}` : "All branches");
              toast.success("Report downloaded");
            }}
          >
            <Download size={16} />
            Download Report
          </Button>
          <BranchFilter value={branchId} onChange={setBranchId} />
        </div>
      </div>

      {isError && (
        <Card className="mb-6 p-4 text-sm text-red-600 dark:text-red-400 dark:text-red-400">
          Couldn&apos;t load reports. Is the API running at <code>NEXT_PUBLIC_API_URL</code>?
        </Card>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Paid Invoices</p>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {isLoading ? "…" : formatCurrency(data?.revenue.paidInvoices ?? 0, currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Won Deals Value</p>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {isLoading ? "…" : formatCurrency(data?.revenue.wonOpportunities ?? 0, currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Total Collections</p>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {isLoading ? "…" : formatCurrency(data?.collections.total ?? 0, currency)}
          </p>
        </Card>
      </div>

      <ReportsCharts
        leadFunnel={leadFunnel}
        opportunityByStage={opportunityByStage}
        collectionsByMonth={collectionsByMonth}
        isLoading={isLoading}
        currency={currency}
        formatCurrency={formatCurrency}
      />

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-700 p-5 dark:border-slate-700">
          <div>
            <h2 className="text-sm font-semibold text-primary">Receivables Aging</h2>
            <p className="mt-0.5 text-xs text-muted">Outstanding balances on unpaid invoices, bucketed by days past due.</p>
          </div>
          {(aging?.invoices.length ?? 0) > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                downloadCsv(
                  "receivables-aging",
                  aging!.invoices.map((inv) => ({
                    code: inv.code,
                    customer: inv.customerName,
                    dueDate: new Date(inv.dueDate).toLocaleDateString(),
                    bucket: AGING_BUCKET_LABELS[inv.bucket],
                    balance: inv.balance,
                    currency: inv.currency,
                  })),
                  [
                    { key: "code", label: "Invoice" },
                    { key: "customer", label: "Customer" },
                    { key: "dueDate", label: "Due Date" },
                    { key: "bucket", label: "Bucket" },
                    { key: "balance", label: "Balance" },
                    { key: "currency", label: "Currency" },
                  ],
                )
              }
            >
              <Download size={14} />
              Export CSV
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-slate-700 sm:grid-cols-5">
          {(Object.keys(AGING_BUCKET_LABELS) as AgingBucket[]).map((bucket) => (
            <div key={bucket} className="bg-surface p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{AGING_BUCKET_LABELS[bucket]}</p>
              <p className="mt-1.5 text-lg font-semibold text-primary">
                {agingLoading ? "…" : formatCurrency(aging?.buckets[bucket] ?? 0, currency)}
              </p>
            </div>
          ))}
        </div>

        {!agingLoading && (aging?.invoices.length ?? 0) === 0 && (
          <p className="p-6 text-center text-sm text-muted">No outstanding receivables.</p>
        )}
        {(aging?.invoices.length ?? 0) > 0 && (
          <table className="w-full text-sm">
            <thead className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-medium uppercase text-muted dark:border-slate-700 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-2.5">Invoice</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Due</th>
                <th className="px-4 py-2.5">Bucket</th>
                <th className="px-4 py-2.5 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 dark:divide-slate-700">
              {aging?.invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-primary">{inv.code}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{inv.customerName}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Badge tone={AGING_BUCKET_TONE[inv.bucket]}>{AGING_BUCKET_LABELS[inv.bucket]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-primary">{formatCurrency(inv.balance, inv.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
