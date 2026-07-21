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
import { useCurrentUser } from "@/lib/auth";
import { useReportsSummary } from "@/lib/reports";
import { Card } from "@/components/ui";

const PIE_COLORS = ["#2563eb", "#1d4ed8", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#0f766e", "#64748b", "#be123c", "#65a30d"];

function label(value: string) {
  return value.replaceAll("_", " ");
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export default function ReportsPage() {
  const { data: user } = useCurrentUser();
  const { data, isLoading, isError } = useReportsSummary();
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
    </div>
  );
}
