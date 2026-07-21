"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { useCurrentUser } from "@/lib/auth";
import { useReportsSummary, useReceivablesAging, AgingBucket } from "@/lib/reports";
import { Badge, Button, Card } from "@/components/ui";
import { downloadCsv } from "@/lib/csv";

const PIE_COLORS = ["#2563eb", "#1d4ed8", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#0f766e", "#64748b", "#be123c", "#65a30d"];

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
  const { data, isLoading, isError } = useReportsSummary();
  const { data: aging, isLoading: agingLoading } = useReceivablesAging();
  const currency = user?.company?.currency ?? "AED";

  const leadFunnel = (data?.leadFunnel ?? []).map((row) => ({ ...row, name: label(row.status) }));
  const opportunityByStage = (data?.opportunityByStage ?? []).map((row) => ({ ...row, name: label(row.stage) }));
  const collectionsByMonth = data?.collections.byMonth ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Reports &amp; Analytics</h1>
        <p className="text-sm text-slate-500">Funnel, pipeline, revenue and collections at a glance.</p>
      </div>

      {isError && (
        <Card className="mb-6 p-4 text-sm text-red-600">
          Couldn&apos;t load reports. Is the API running at <code>NEXT_PUBLIC_API_URL</code>?
        </Card>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Paid Invoices</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {isLoading ? "…" : formatCurrency(data?.revenue.paidInvoices ?? 0, currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Won Opportunities</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {isLoading ? "…" : formatCurrency(data?.revenue.wonOpportunities ?? 0, currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total Collections</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {isLoading ? "…" : formatCurrency(data?.collections.total ?? 0, currency)}
          </p>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Lead Funnel by Status</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadFunnel}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Leads" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="py-1">Status</th>
                <th className="py-1 text-right">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leadFunnel.map((row) => (
                <tr key={row.status}>
                  <td className="py-1.5 text-slate-600">{row.name}</td>
                  <td className="py-1.5 text-right font-medium text-slate-900">{row.count}</td>
                </tr>
              ))}
              {leadFunnel.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={2} className="py-3 text-center text-slate-400">
                    No leads yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Opportunities by Stage</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={opportunityByStage} dataKey="count" nameKey="name" outerRadius={90} label={(entry) => entry.count}>
                  {opportunityByStage.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, _n, ctx: any) => [`${value} · ${formatCurrency(ctx?.payload?.value ?? 0, currency)}`, ctx?.payload?.name]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="py-1">Stage</th>
                <th className="py-1 text-right">Count</th>
                <th className="py-1 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {opportunityByStage.map((row) => (
                <tr key={row.stage}>
                  <td className="py-1.5 text-slate-600">{row.name}</td>
                  <td className="py-1.5 text-right font-medium text-slate-900">{row.count}</td>
                  <td className="py-1.5 text-right text-slate-600">{formatCurrency(row.value, currency)}</td>
                </tr>
              ))}
              {opportunityByStage.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={3} className="py-3 text-center text-slate-400">
                    No opportunities yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Collections by Month</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={collectionsByMonth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
              <Line type="monotone" dataKey="amount" name="Collected" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {collectionsByMonth.length === 0 && !isLoading && (
          <p className="mt-2 text-center text-sm text-slate-400">No payments recorded yet.</p>
        )}
      </Card>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Receivables Aging</h2>
            <p className="mt-0.5 text-xs text-slate-500">Outstanding balances on unpaid invoices, bucketed by days past due.</p>
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

        <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-5">
          {(Object.keys(AGING_BUCKET_LABELS) as AgingBucket[]).map((bucket) => (
            <div key={bucket} className="bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{AGING_BUCKET_LABELS[bucket]}</p>
              <p className="mt-1.5 text-lg font-semibold text-slate-900">
                {agingLoading ? "…" : formatCurrency(aging?.buckets[bucket] ?? 0, currency)}
              </p>
            </div>
          ))}
        </div>

        {!agingLoading && (aging?.invoices.length ?? 0) === 0 && (
          <p className="p-6 text-center text-sm text-slate-400">No outstanding receivables.</p>
        )}
        {(aging?.invoices.length ?? 0) > 0 && (
          <table className="w-full text-sm">
            <thead className="border-t border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Invoice</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Due</th>
                <th className="px-4 py-2.5">Bucket</th>
                <th className="px-4 py-2.5 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aging?.invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{inv.code}</td>
                  <td className="px-4 py-3 text-slate-600">{inv.customerName}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Badge tone={AGING_BUCKET_TONE[inv.bucket]}>{AGING_BUCKET_LABELS[inv.bucket]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(inv.balance, inv.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
