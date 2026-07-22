"use client";

import Link from "next/link";
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
import { formatChartLabel, LEAD_STATUS_MEANINGS } from "@/lib/chart-labels";

const PIE_COLORS = ["#2563eb", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

type ChartRow = { name: string; count: number; status?: string; stage?: string };
type CollectionRow = { month: string; amount: number };

export type DashboardChartsProps = {
  pipelineByStage: ChartRow[];
  leadFunnel: ChartRow[];
  collectionsByMonth: CollectionRow[];
  reportsLoading: boolean;
  currency: string;
  formatCurrency: (amount: number, currency: string) => string;
};

export function DashboardCharts({
  pipelineByStage,
  leadFunnel,
  collectionsByMonth,
  reportsLoading,
  currency,
  formatCurrency,
}: DashboardChartsProps) {
  const chart = useChartTheme();

  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-primary">Open Pipeline by Stage</h2>
            <Link href="/pipeline" className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400">
              View pipeline
            </Link>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineByStage} margin={{ left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chart.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: chart.axis }} interval={0} angle={-20} textAnchor="end" height={54} />
                <YAxis tick={{ fontSize: 11, fill: chart.axis }} allowDecimals={false} />
                <Tooltip cursor={{ fill: chart.cursor }} contentStyle={tooltipContentStyle(chart)} formatter={(value: number) => [value, "Opportunities"]} />
                <Bar dataKey="count" name="Opportunities" fill="#38a169" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {!reportsLoading && pipelineByStage.length === 0 && (
            <p className="mt-2 text-center text-sm text-slate-400">No open opportunities yet.</p>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-primary">Lead Funnel</h2>
            <Link href="/leads" className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400">
              View leads
            </Link>
          </div>
          <p className="mb-3 text-xs text-muted">How many leads are at each stage of qualification.</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={leadFunnel} dataKey="count" nameKey="name" outerRadius={72} label={false}>
                  {leadFunnel.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipContentStyle(chart)}
                  formatter={(value: number, _name, item: { payload?: ChartRow }) => {
                    const key = item.payload?.status ?? item.payload?.name?.toUpperCase().replaceAll(" ", "_") ?? "";
                    const hint = LEAD_STATUS_MEANINGS[key];
                    return [`${value} lead${value === 1 ? "" : "s"}${hint ? ` — ${hint}` : ""}`, item.payload?.name ?? "Status"];
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: chart.axis }}
                  formatter={(value) => <span className="text-slate-600 dark:text-slate-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-700">
            {leadFunnel.map((row, index) => {
              const key = row.status ?? row.name.toUpperCase().replaceAll(" ", "_");
              return (
                <li key={row.name} className="flex items-start gap-2 text-xs">
                  <span
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 text-slate-600 dark:text-slate-400">
                    <span className="font-medium text-primary">{row.name}</span>
                    {LEAD_STATUS_MEANINGS[key] ? ` — ${LEAD_STATUS_MEANINGS[key]}` : ""}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-primary">{row.count}</span>
                </li>
              );
            })}
          </ul>
          {!reportsLoading && leadFunnel.length === 0 && (
            <p className="mt-2 text-center text-sm text-slate-400">No leads yet.</p>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-primary">Collections Trend</h2>
            <Link href="/reports" className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400">
              Full reports
            </Link>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={collectionsByMonth} margin={{ left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chart.grid} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: chart.axis }} />
                <YAxis tick={{ fontSize: 11, fill: chart.axis }} />
                <Tooltip contentStyle={tooltipContentStyle(chart)} formatter={(value: number) => formatCurrency(value, currency)} />
                <Line type="monotone" dataKey="amount" name="Collected" stroke="#2f855a" strokeWidth={2} dot={{ r: 3, fill: "#2f855a" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {!reportsLoading && collectionsByMonth.length === 0 && (
            <p className="mt-2 text-center text-sm text-slate-400">No payments recorded yet.</p>
          )}
        </Card>
      </div>
    </>
  );
}
