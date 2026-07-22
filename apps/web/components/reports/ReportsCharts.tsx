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
import { Card } from "@/components/ui";
import { useChartTheme, tooltipContentStyle } from "@/lib/chart-theme";

const PIE_COLORS = ["#2563eb", "#1d4ed8", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#0f766e", "#64748b", "#be123c", "#65a30d"];

type FunnelRow = { status: string; name: string; count: number };
type StageRow = { stage: string; name: string; count: number; value: number };
type CollectionRow = { month: string; amount: number };

export type ReportsChartsProps = {
  leadFunnel: FunnelRow[];
  opportunityByStage: StageRow[];
  collectionsByMonth: CollectionRow[];
  isLoading: boolean;
  currency: string;
  formatCurrency: (amount: number, currency: string) => string;
};

export function ReportsCharts({
  leadFunnel,
  opportunityByStage,
  collectionsByMonth,
  isLoading,
  currency,
  formatCurrency,
}: ReportsChartsProps) {
  const chart = useChartTheme();

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-primary">Lead Funnel by Status</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadFunnel}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chart.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: chart.axis }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: chart.axis }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipContentStyle(chart)} />
                <Bar dataKey="count" name="Leads" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted">
              <tr>
                <th className="py-1">Status</th>
                <th className="py-1 text-right">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 dark:divide-slate-700">
              {leadFunnel.map((row) => (
                <tr key={row.status}>
                  <td className="py-1.5 text-slate-600 dark:text-slate-400">{row.name}</td>
                  <td className="py-1.5 text-right font-medium text-primary">{row.count}</td>
                </tr>
              ))}
              {leadFunnel.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={2} className="py-3 text-center text-muted">
                    No leads yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-primary">Opportunities by Stage</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={opportunityByStage} dataKey="count" nameKey="name" outerRadius={90} label={(entry) => entry.count}>
                  {opportunityByStage.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipContentStyle(chart)}
                  formatter={(value: number, _n, ctx: { payload?: { value?: number; name?: string } }) => [
                    `${value} · ${formatCurrency(ctx?.payload?.value ?? 0, currency)}`,
                    ctx?.payload?.name,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: chart.axis }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted">
              <tr>
                <th className="py-1">Stage</th>
                <th className="py-1 text-right">Count</th>
                <th className="py-1 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 dark:divide-slate-700">
              {opportunityByStage.map((row) => (
                <tr key={row.stage}>
                  <td className="py-1.5 text-slate-600 dark:text-slate-400">{row.name}</td>
                  <td className="py-1.5 text-right font-medium text-primary">{row.count}</td>
                  <td className="py-1.5 text-right text-slate-600 dark:text-slate-400">{formatCurrency(row.value, currency)}</td>
                </tr>
              ))}
              {opportunityByStage.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={3} className="py-3 text-center text-muted">
                    No opportunities yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-primary">Collections by Month</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={collectionsByMonth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chart.grid} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: chart.axis }} />
              <YAxis tick={{ fontSize: 11, fill: chart.axis }} />
              <Tooltip contentStyle={tooltipContentStyle(chart)} formatter={(value: number) => formatCurrency(value, currency)} />
              <Line type="monotone" dataKey="amount" name="Collected" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {collectionsByMonth.length === 0 && !isLoading && (
          <p className="mt-2 text-center text-sm text-muted">No payments recorded yet.</p>
        )}
      </Card>
    </>
  );
}
