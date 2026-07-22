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
  UserPlus,
  CheckSquare,
  CalendarDays,
  AlertTriangle,
  Trophy,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
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
import { useCurrentUser } from "@/lib/auth";
import { useDashboardSpotlight, useExecutiveSummary } from "@/lib/dashboard";
import { useReportsSummary } from "@/lib/reports";
import { Badge, Card } from "@/components/ui";
import { BranchFilter } from "@/components/BranchFilter";

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

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PIE_COLORS = ["#2563eb", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

const STATUS_TONE: Record<string, "slate" | "green" | "amber" | "red" | "blue"> = {
  NEW: "blue",
  CONTACTED: "amber",
  QUALIFIED: "green",
  DISQUALIFIED: "red",
  CONVERTED: "green",
};

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
  const [branchId, setBranchId] = useState("");
  const { data: summary, isLoading, isError } = useExecutiveSummary(branchId || undefined);
  const { data: spotlight, isLoading: spotlightLoading } = useDashboardSpotlight(branchId || undefined);
  const { data: reports, isLoading: reportsLoading } = useReportsSummary(branchId || undefined);
  const currency = user?.company?.currency ?? "AED";

  const pipelineByStage = (reports?.opportunityByStage ?? [])
    .filter((row) => row.stage !== "WON" && row.stage !== "LOST")
    .map((row) => ({ ...row, name: label(row.stage) }));
  const leadFunnel = (reports?.leadFunnel ?? []).map((row) => ({ ...row, name: label(row.status) }));
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
      hint: `${summary?.newLeadCount7d ?? 0} new in last 7 days`,
    },
    {
      label: "Unassigned Leads",
      value: String(summary?.unassignedLeadCount ?? 0),
      href: "/leads",
      icon: UserPlus,
      tone: "amber",
      hint: "Need an owner",
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
      label: "Won Deals",
      value: String(summary?.wonOpportunityCount ?? 0),
      href: "/opportunities",
      icon: Trophy,
      tone: "emerald",
      hint: "Closed-won opportunities",
    },
    {
      label: "Pending Approvals",
      value: String(summary?.pendingApprovalCount ?? 0),
      href: "/approvals",
      icon: CheckSquare,
      tone: "violet",
      hint: "Quotations awaiting decision",
    },
    {
      label: "Upcoming Follow-ups",
      value: String(summary?.upcomingEventCount ?? 0),
      href: "/calendar",
      icon: CalendarDays,
      tone: "cyan",
      hint: "Next 14 days",
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

  const attention = [
    {
      show: (summary?.unassignedLeadCount ?? 0) > 0,
      tone: "amber" as const,
      title: `${summary?.unassignedLeadCount ?? 0} unassigned lead${summary?.unassignedLeadCount === 1 ? "" : "s"}`,
      body: "Assign owners so follow-ups aren’t missed.",
      href: "/leads",
    },
    {
      show: (summary?.pendingApprovalCount ?? 0) > 0,
      tone: "violet" as const,
      title: `${summary?.pendingApprovalCount ?? 0} quotation approval${summary?.pendingApprovalCount === 1 ? "" : "s"} pending`,
      body: "Discount / price overrides waiting for a decision.",
      href: "/approvals",
    },
    {
      show: (summary?.overdueInvoiceCount ?? 0) > 0,
      tone: "red" as const,
      title: `${summary?.overdueInvoiceCount ?? 0} overdue invoice${summary?.overdueInvoiceCount === 1 ? "" : "s"}`,
      body: "Collections risk — chase payments.",
      href: "/finance",
    },
    {
      show: (summary?.amcExpiringSoonCount ?? 0) > 0,
      tone: "slate" as const,
      title: `${summary?.amcExpiringSoonCount ?? 0} AMC contract${summary?.amcExpiringSoonCount === 1 ? "" : "s"} expiring`,
      body: "Start renewal conversations within 90 days.",
      href: "/amc",
    },
    {
      show: (summary?.openTicketCount ?? 0) > 0,
      tone: "amber" as const,
      title: `${summary?.openTicketCount ?? 0} open support ticket${summary?.openTicketCount === 1 ? "" : "s"}`,
      body: "Check SLA response windows.",
      href: "/support",
    },
  ].filter((item) => item.show);

  const quickLinks = [
    { href: "/leads/new", label: "New Lead" },
    { href: "/opportunities/new", label: "New Opportunity" },
    { href: "/quotations/new", label: "New Quotation" },
    { href: "/calendar/new", label: "Schedule Follow-up" },
    { href: "/approvals", label: "Approvals Inbox" },
    { href: "/ai-assistant", label: "Ask AI Assistant" },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Executive Dashboard</h1>
          <p className="text-sm text-slate-500">
            Real-time snapshot across sales, delivery, finance, and support
            {user?.company ? ` for ${user.company.name}` : ""}.
          </p>
        </div>
        <BranchFilter value={branchId} onChange={setBranchId} />
      </div>

      {isError && (
        <Card className="mb-6 p-4 text-sm text-red-600">
          Couldn&apos;t load the dashboard summary. Is the API running at <code>NEXT_PUBLIC_API_URL</code>?
        </Card>
      )}

      {attention.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50/60 p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-slate-900">Needs attention</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {attention.map((item) => (
              <Link
                key={item.href + item.title}
                href={item.href}
                className="rounded-md border border-amber-100 bg-white px-4 py-3 transition-shadow hover:shadow-sm"
              >
                <p className="text-sm font-medium text-slate-900">{item.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{item.body}</p>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Paid invoices</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {reportsLoading ? "…" : formatCurrency(reports?.revenue.paidInvoices ?? 0, currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Won opportunity value</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {reportsLoading ? "…" : formatCurrency(reports?.revenue.wonOpportunities ?? 0, currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total collections</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {reportsLoading ? "…" : formatCurrency(reports?.collections.total ?? 0, currency)}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
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
            <h2 className="text-sm font-semibold text-slate-900">Lead Funnel</h2>
            <Link href="/leads" className="text-xs font-medium text-brand-700 hover:underline">
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

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
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

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Quick actions</h2>
            <Sparkles size={14} className="text-brand-600" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent leads</h2>
            <Link href="/leads" className="text-xs font-medium text-brand-700 hover:underline">
              View all
            </Link>
          </div>
          {spotlightLoading && <p className="p-5 text-sm text-slate-400">Loading…</p>}
          {!spotlightLoading && (spotlight?.recentLeads.length ?? 0) === 0 && (
            <p className="p-5 text-sm text-slate-400">No leads yet.</p>
          )}
          {(spotlight?.recentLeads.length ?? 0) > 0 && (
            <ul className="divide-y divide-slate-100">
              {spotlight!.recentLeads.map((lead) => (
                <li key={lead.id}>
                  <Link href={`/leads/${lead.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {lead.companyName}{" "}
                        <span className="font-normal text-slate-400">{lead.code}</span>
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {lead.contactName} · score {lead.score}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[lead.status] ?? "slate"}>{lead.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Top open opportunities</h2>
            <Link href="/opportunities" className="text-xs font-medium text-brand-700 hover:underline">
              View all
            </Link>
          </div>
          {spotlightLoading && <p className="p-5 text-sm text-slate-400">Loading…</p>}
          {!spotlightLoading && (spotlight?.topOpportunities.length ?? 0) === 0 && (
            <p className="p-5 text-sm text-slate-400">No open opportunities yet.</p>
          )}
          {(spotlight?.topOpportunities.length ?? 0) > 0 && (
            <ul className="divide-y divide-slate-100">
              {spotlight!.topOpportunities.map((opp) => (
                <li key={opp.id}>
                  <Link href={`/opportunities/${opp.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {opp.title}{" "}
                        <span className="font-normal text-slate-400">{opp.code}</span>
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {opp.customerName ?? "—"} · {label(opp.stage)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-900">
                      {formatCurrency(opp.estimatedValue, opp.currency)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Upcoming follow-ups</h2>
            <Link href="/calendar" className="text-xs font-medium text-brand-700 hover:underline">
              Calendar
            </Link>
          </div>
          {spotlightLoading && <p className="p-5 text-sm text-slate-400">Loading…</p>}
          {!spotlightLoading && (spotlight?.upcomingEvents.length ?? 0) === 0 && (
            <p className="p-5 text-sm text-slate-400">No upcoming events in the next 14 days.</p>
          )}
          {(spotlight?.upcomingEvents.length ?? 0) > 0 && (
            <ul className="divide-y divide-slate-100">
              {spotlight!.upcomingEvents.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{event.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {label(event.type)}
                      {event.opportunityCode ? ` · ${event.opportunityCode}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs font-medium text-slate-600">{formatWhen(event.startAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Pending approvals</h2>
            <Link href="/approvals" className="text-xs font-medium text-brand-700 hover:underline">
              Inbox
            </Link>
          </div>
          {spotlightLoading && <p className="p-5 text-sm text-slate-400">Loading…</p>}
          {!spotlightLoading && (spotlight?.pendingApprovals.length ?? 0) === 0 && (
            <p className="p-5 text-sm text-slate-400">No pending approvals.</p>
          )}
          {(spotlight?.pendingApprovals.length ?? 0) > 0 && (
            <ul className="divide-y divide-slate-100">
              {spotlight!.pendingApprovals.map((approval) => (
                <li key={approval.id}>
                  <Link href="/approvals" className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {approval.quotationCode ?? "Quotation"}{" "}
                        <span className="font-normal text-slate-400">{approval.customerName ?? ""}</span>
                      </p>
                      <p className="truncate text-xs text-slate-500">{approval.reason ?? "Approval required"}</p>
                    </div>
                    {approval.grandTotal != null && approval.currency && (
                      <p className="shrink-0 text-sm font-semibold text-slate-900">
                        {formatCurrency(approval.grandTotal, approval.currency)}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {(spotlight?.expiringAmcs.length ?? 0) > 0 && (
        <Card className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">AMC renewals due</h2>
              <p className="text-xs text-slate-500">Contracts ending within 90 days</p>
            </div>
            <Link href="/amc" className="text-xs font-medium text-brand-700 hover:underline">
              View contracts
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-5 py-2.5">Contract</th>
                <th className="px-5 py-2.5">Customer</th>
                <th className="px-5 py-2.5">Ends</th>
                <th className="px-5 py-2.5 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {spotlight!.expiringAmcs.map((contract) => (
                <tr key={contract.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/amc/${contract.id}`} className="font-medium text-brand-600 hover:underline">
                      {contract.code}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{contract.customerName ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {new Date(contract.endDate).toLocaleDateString()}
                    <span className="ml-2 text-xs font-medium text-amber-700">({contract.daysToExpiry}d)</span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-slate-900">
                    {formatCurrency(contract.contractValue, contract.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
