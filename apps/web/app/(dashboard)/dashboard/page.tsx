"use client";

import Link from "next/link";
import {
  Users,
  Target,
  Wallet,
  FileText,
  FolderKanban,
  LifeBuoy,
  Receipt,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useCurrentUser } from "@/lib/auth";
import { useExecutiveSummary } from "@/lib/dashboard";
import { useReportsSummary } from "@/lib/reports";
import { Card } from "@/components/ui";

function label(value: string) {
  return value.replaceAll("_", " ");
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

const TONES = {
  blue: { bg: "bg-blue-50", text: "text-blue-600" },
  brand: { bg: "bg-brand-50", text: "text-brand-600" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
  amber: { bg: "bg-amber-50", text: "text-amber-600" },
  violet: { bg: "bg-violet-50", text: "text-violet-600" },
  red: { bg: "bg-red-50", text: "text-red-600" },
  slate: { bg: "bg-slate-100", text: "text-slate-600" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-600" },
} as const;

export default function ExecutiveDashboardPage() {
  const { data: user } = useCurrentUser();
  const { data: summary, isLoading, isError } = useExecutiveSummary();
  const { data: reports, isLoading: reportsLoading } = useReportsSummary();
  const currency = user?.company?.currency ?? "AED";

  const pipelineByStage = (reports?.opportunityByStage ?? [])
    .filter((row) => row.stage !== "WON" && row.stage !== "LOST")
    .map((row) => ({ ...row, name: label(row.stage) }));
  const collectionsByMonth = reports?.collections.byMonth ?? [];

  const cards: {
    label: string;
    value: string;
    href: string;
    icon: typeof Users;
    tone: keyof typeof TONES;
    hint: string;
  }[] = [
    {
      label: "Leads",
      value: String(summary?.leadCount ?? 0),
      href: "/leads",
      icon: Users,
      tone: "blue",
      hint: "Total leads captured",
    },
    {
      label: "Open Opportunities",
      value: String(summary?.openOpportunityCount ?? 0),
      href: "/opportunities",
      icon: Target,
      tone: "brand",
      hint: "Active in the pipeline",
    },
    {
      label: "Pipeline Value",
      value: formatCurrency(summary?.pipelineValue ?? 0, currency),
      href: "/pipeline",
      icon: Wallet,
      tone: "emerald",
      hint: "Sum of open estimated value",
    },
    {
      label: "Quotations",
      value: String(summary?.quotationCount ?? 0),
      href: "/quotations",
      icon: FileText,
      tone: "violet",
      hint: "Total quotations issued",
    },
    {
      label: "Open Projects",
      value: String(summary?.openProjectCount ?? 0),
      href: "/projects",
      icon: FolderKanban,
      tone: "cyan",
      hint: "In delivery, not yet closed",
    },
    {
      label: "Open Support Tickets",
      value: String(summary?.openTicketCount ?? 0),
      href: "/support",
      icon: LifeBuoy,
      tone: "amber",
      hint: "Awaiting resolution",
    },
    {
      label: "Overdue Invoices",
      value: String(summary?.overdueInvoiceCount ?? 0),
      href: "/finance",
      icon: Receipt,
      tone: "red",
      hint: "Past due date, unpaid",
    },
    {
      label: "AMC Expiring Soon",
      value: String(summary?.amcExpiringSoonCount ?? 0),
      href: "/amc",
      icon: ShieldCheck,
      tone: "slate",
      hint: "Renewing within 90 days",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Executive Dashboard</h1>
        <p className="text-sm text-slate-500">
          Real-time snapshot across sales, delivery, finance, and support{user?.company ? ` for ${user.company.name}` : ""}.
        </p>
      </div>

      {isError && (
        <Card className="mb-6 p-4 text-sm text-red-600">
          Couldn&apos;t load the dashboard summary. Is the API running at <code>NEXT_PUBLIC_API_URL</code>?
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const tone = TONES[card.tone];
          return (
            <Link key={card.label} href={card.href} className="group">
              <Card className="flex h-full flex-col justify-between p-5 transition-shadow group-hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone.bg} ${tone.text}`}>
                    <Icon size={20} />
                  </div>
                  <ArrowRight size={16} className="mt-1 text-slate-300 transition-colors group-hover:text-slate-500" />
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-semibold text-slate-900">{isLoading ? "…" : card.value}</p>
                  <p className="mt-1 text-sm font-medium text-slate-600">{card.label}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{card.hint}</p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Open Pipeline by Stage</h2>
            <Link href="/pipeline" className="text-xs font-medium text-brand-700 hover:underline">
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
            <h2 className="text-sm font-semibold text-slate-900">Collections Trend</h2>
            <Link href="/reports" className="text-xs font-medium text-brand-700 hover:underline">
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
    </div>
  );
}
