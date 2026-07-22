"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

const PIE_COLORS = ["#2563eb", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

type ChartRow = { name: string; count: number };
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
  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Open Pipeline by Stage</h2>
            <Link href="/pipeline" className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400">
              View pipeline
            </Link>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineByStage} margin={{ left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-20} textAnchor="end" height={54} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip cursor={{ fill: "#f1f5f9" }} formatter={(value: number) => [value, "Opportunities"]} />
                <Bar dataKey="count" name="Opportunities" fill="#38a169" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {!reportsLoading && pipelineByStage.length === 0 && (
            <p className="mt-2 text-center text-sm text-slate-400">No open opportunities yet.</p>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Lead Funnel</h2>
            <Link href="/leads" className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400">
              View leads
            </Link>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={leadFunnel} dataKey="count" nameKey="name" outerRadius={80} label={(entry) => entry.count}>
                  {leadFunnel.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {!reportsLoading && leadFunnel.length === 0 && (
            <p className="mt-2 text-center text-sm text-slate-400">No leads yet.</p>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Collections Trend</h2>
            <Link href="/reports" className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400">
              Full reports
            </Link>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={collectionsByMonth} margin={{ left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
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
