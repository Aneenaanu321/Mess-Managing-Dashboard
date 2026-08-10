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
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useCurrentUser } from "@/lib/auth";
import { useDashboardSpotlight, useExecutiveSummary } from "@/lib/dashboard";
import { useReportsSummary } from "@/lib/reports";
import { Badge, Card } from "@/components/ui";
import { BranchFilter } from "@/components/BranchFilter";
import { formatChartLabel } from "@/lib/chart-labels";
import { getNewItemLabel, getPageLabel } from "@/lib/nav-labels";

const DashboardCharts = dynamic(() => import("@/components/dashboard/DashboardCharts").then((m) => m.DashboardCharts), {
  ssr: false,
  loading: () => (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="h-72 animate-pulse bg-slate-100 dark:bg-slate-800 lg:col-span-2" />
        <Card className="h-72 animate-pulse bg-slate-100 dark:bg-slate-800" />
      </div>
      <Card className="h-72 animate-pulse bg-slate-100 dark:bg-slate-800" />
    </div>
  ),
});

function label(value: string) {
  return formatChartLabel(value);
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
  red: { bg: "bg-red-50 dark:bg-red-950/40", text: "text-red-600 dark:text-red-400" },
  slate: { bg: "bg-slate-100", text: "text-slate-600" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-600" },
} as const;

export default function ExecutiveDashboardPage() {
  const { data: user } = useCurrentUser();
  const [branchId, setBranchId] = useState("");
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const { data: summary, isLoading, isError } = useExecutiveSummary(branchId || undefined);
  const { data: spotlight, isLoading: spotlightLoading } = useDashboardSpotlight(branchId || undefined);
  const { data: reports, isLoading: reportsLoading } = useReportsSummary(branchId || undefined);
  const currency = user?.company?.currency ?? "AED";

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rfidcore_dashboard_hidden_widgets");
      if (raw) setHiddenWidgets(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  function toggleWidget(id: string) {
    setHiddenWidgets((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("rfidcore_dashboard_hidden_widgets", JSON.stringify(next));
      return next;
    });
  }

  const pipelineByStage = (reports?.opportunityByStage ?? [])
    .filter((row) => row.stage !== "WON" && row.stage !== "LOST")
    .map((row) => ({ ...row, name: label(row.stage) }));
  const leadFunnel = (reports?.leadFunnel ?? []).map((row) => ({
    ...row,
    status: row.status,
    name: formatChartLabel(row.status),
  }));
  const collectionsByMonth = reports?.collections.byMonth ?? [];

  const cards: {
    id: string;
    label: string;
    value: string;
    href: string;
    icon: typeof Users;
    tone: keyof typeof TONES;
    hint: string;
  }[] = [
    {
      id: "leads",
      label: getPageLabel("/new-inquiries"),
      value: String(summary?.leadCount ?? 0),
      href: "/new-inquiries",
      icon: Users,
      tone: "blue",
      hint: `${summary?.newLeadCount7d ?? 0} new in last 7 days`,
    },
    {
      id: "unassigned",
      label: `Unassigned ${getPageLabel("/new-inquiries")}`,
      value: String(summary?.unassignedLeadCount ?? 0),
      href: "/new-inquiries",
      icon: UserPlus,
      tone: "amber",
      hint: "Need an owner",
    },
    {
      id: "deals",
      label: `Open ${getPageLabel("/active-deals")}`,
      value: String(summary?.openOpportunityCount ?? 0),
      href: "/active-deals",
      icon: Target,
      tone: "brand",
      hint: `Active on the ${getPageLabel("/deal-board").toLowerCase()}`,
    },
    {
      id: "pipeline",
      label: `${getPageLabel("/deal-board")} Value`,
      value: formatCurrency(summary?.pipelineValue ?? 0, currency),
      href: "/deal-board",
      icon: Wallet,
      tone: "emerald",
      hint: "Sum of open estimated value",
    },
    {
      id: "won",
      label: "Won Deals",
      value: String(summary?.wonOpportunityCount ?? 0),
      href: "/active-deals",
      icon: Trophy,
      tone: "emerald",
      hint: `Closed-won ${getPageLabel("/active-deals").toLowerCase()}`,
    },
    {
      id: "approvals",
      label: getPageLabel("/pending-approvals"),
      value: String(summary?.pendingApprovalCount ?? 0),
      href: "/pending-approvals",
      icon: CheckSquare,
      tone: "violet",
      hint: `${getPageLabel("/orders")} awaiting decision`,
    },
    {
      id: "followups",
      label: "Upcoming Follow-ups",
      value: String(summary?.upcomingEventCount ?? 0),
      href: "/calendar",
      icon: CalendarDays,
      tone: "cyan",
      hint: "Next 14 days",
    },
    {
      id: "orders",
      label: getPageLabel("/orders"),
      value: String(summary?.quotationCount ?? 0),
      href: "/orders",
      icon: FileText,
      tone: "violet",
      hint: `Total ${getPageLabel("/orders").toLowerCase()} issued`,
    },
    {
      id: "projects",
      label: `Open ${getPageLabel("/customer-projects")}`,
      value: String(summary?.openProjectCount ?? 0),
      href: "/customer-projects",
      icon: FolderKanban,
      tone: "cyan",
      hint: "In delivery, not yet closed",
    },
    {
      id: "support",
      label: getPageLabel("/customer-support"),
      value: String(summary?.openTicketCount ?? 0),
      href: "/customer-support",
      icon: LifeBuoy,
      tone: "amber",
      hint: "Awaiting resolution",
    },
    {
      id: "overdue",
      label: "Overdue Invoices",
      value: String(summary?.overdueInvoiceCount ?? 0),
      href: "/invoices-payments",
      icon: Receipt,
      tone: "red",
      hint: "Past due date, unpaid",
    },
    {
      id: "amc",
      label: `${getPageLabel("/service-contracts")} Expiring`,
      value: String(summary?.amcExpiringSoonCount ?? 0),
      href: "/service-contracts",
      icon: ShieldCheck,
      tone: "slate",
      hint: "Renewing within 90 days",
    },
  ];

  const visibleCards = cards.filter((c) => !hiddenWidgets.includes(c.id));

  const attention = [
    {
      show: (summary?.unassignedLeadCount ?? 0) > 0,
      tone: "amber" as const,
      title: `${summary?.unassignedLeadCount ?? 0} unassigned ${getPageLabel("/new-inquiries").toLowerCase().replace(/s$/, "")}${summary?.unassignedLeadCount === 1 ? "" : "s"}`,
      body: "Assign owners so follow-ups aren’t missed.",
      href: "/new-inquiries",
    },
    {
      show: (summary?.pendingApprovalCount ?? 0) > 0,
      tone: "violet" as const,
      title: `${summary?.pendingApprovalCount ?? 0} ${getPageLabel("/orders").toLowerCase()} approval${summary?.pendingApprovalCount === 1 ? "" : "s"} pending`,
      body: "Discount / price overrides waiting for a decision.",
      href: "/pending-approvals",
    },
    {
      show: (summary?.overdueInvoiceCount ?? 0) > 0,
      tone: "red" as const,
      title: `${summary?.overdueInvoiceCount ?? 0} overdue invoice${summary?.overdueInvoiceCount === 1 ? "" : "s"}`,
      body: "Collections risk — chase payments.",
      href: "/invoices-payments",
    },
    {
      show: (summary?.amcExpiringSoonCount ?? 0) > 0,
      tone: "slate" as const,
      title: `${summary?.amcExpiringSoonCount ?? 0} ${getPageLabel("/service-contracts").toLowerCase()} expiring`,
      body: "Start renewal conversations within 90 days.",
      href: "/service-contracts",
    },
    {
      show: (summary?.openTicketCount ?? 0) > 0,
      tone: "amber" as const,
      title: `${summary?.openTicketCount ?? 0} open ${getPageLabel("/customer-support").toLowerCase()} ticket${summary?.openTicketCount === 1 ? "" : "s"}`,
      body: "Check SLA response windows.",
      href: "/customer-support",
    },
  ].filter((item) => item.show);

  const quickLinks = [
    { href: "/new-inquiries/new", label: getNewItemLabel("/new-inquiries") },
    { href: "/active-deals/new", label: getNewItemLabel("/active-deals") },
    { href: "/orders/new", label: getNewItemLabel("/orders") },
    { href: "/calendar/new", label: "Schedule Follow-up" },
    { href: "/pending-approvals", label: `${getPageLabel("/pending-approvals")} Inbox` },
    { href: "/sales-assistant", label: `Ask ${getPageLabel("/sales-assistant")}` },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-primary">{getPageLabel("/dashboard")}</h1>
          <p className="text-sm text-slate-500">
            Real-time snapshot across sales, delivery, finance, and support
            {user?.company ? ` for ${user.company.name}` : ""}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCustomizeOpen((o) => !o)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {customizeOpen ? "Done" : "Customize widgets"}
          </button>
          <BranchFilter value={branchId} onChange={setBranchId} />
        </div>
      </div>

      {customizeOpen && (
        <Card className="mb-6 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Show / hide KPI widgets</p>
          <div className="flex flex-wrap gap-2">
            {cards.map((card) => {
              const on = !hiddenWidgets.includes(card.id);
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => toggleWidget(card.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                    on
                      ? "bg-brand-50 text-brand-800 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-200"
                      : "bg-slate-50 text-slate-400 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {card.label}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {isError && (
        <Card className="mb-6 p-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load the dashboard summary. Is the API running at <code>NEXT_PUBLIC_API_URL</code>?
        </Card>
      )}

      {attention.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50/60 p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-primary">Needs attention</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {attention.map((item) => (
              <Link
                key={item.href + item.title}
                href={item.href}
                className="rounded-md border border-amber-100 bg-surface px-4 py-3 transition-shadow hover:shadow-sm"
              >
                <p className="text-sm font-medium text-primary">{item.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{item.body}</p>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Paid invoices</p>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {reportsLoading ? "…" : formatCurrency(reports?.revenue.paidInvoices ?? 0, currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Won deals value</p>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {reportsLoading ? "…" : formatCurrency(reports?.revenue.wonOpportunities ?? 0, currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total collections</p>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {reportsLoading ? "…" : formatCurrency(reports?.collections.total ?? 0, currency)}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        {visibleCards.map((card) => {
          const Icon = card.icon;
          const tone = TONES[card.tone];
          return (
            <Link key={card.id} href={card.href} className="group">
              <Card className="flex h-full flex-col justify-between p-4 transition-shadow group-hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone.bg} ${tone.text}`}>
                    <Icon size={16} />
                  </div>
                  <ArrowRight size={16} className="mt-1 text-slate-300 transition-colors group-hover:text-slate-500" />
                </div>
                <div className="mt-3">
                  <p className="text-xl font-semibold text-primary">{isLoading ? "…" : card.value}</p>
                  <p className="mt-1 text-sm font-medium text-slate-600">{card.label}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{card.hint}</p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <DashboardCharts
        pipelineByStage={pipelineByStage}
        leadFunnel={leadFunnel}
        collectionsByMonth={collectionsByMonth}
        reportsLoading={reportsLoading}
        currency={currency}
        formatCurrency={formatCurrency}
      />

      <div className="mt-6">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-primary dark:text-slate-100">Quick actions</h2>
            <Sparkles size={14} className="text-brand-600" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-700 dark:hover:bg-brand-900/30 dark:hover:text-brand-300"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <h2 className="text-sm font-semibold text-primary">Recent {getPageLabel("/new-inquiries").toLowerCase()}</h2>
            <Link href="/new-inquiries" className="text-xs font-medium text-brand-700 hover:underline">
              View all
            </Link>
          </div>
          {spotlightLoading && <p className="p-5 text-sm text-slate-400">Loading…</p>}
          {!spotlightLoading && (spotlight?.recentLeads.length ?? 0) === 0 && (
            <p className="p-5 text-sm text-slate-400">No inquiries yet.</p>
          )}
          {(spotlight?.recentLeads.length ?? 0) > 0 && (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {spotlight!.recentLeads.map((lead) => (
                <li key={lead.id}>
                  <Link href={`/new-inquiries/${lead.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-primary">
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
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <h2 className="text-sm font-semibold text-primary">Top open {getPageLabel("/active-deals").toLowerCase()}</h2>
            <Link href="/active-deals" className="text-xs font-medium text-brand-700 hover:underline">
              View all
            </Link>
          </div>
          {spotlightLoading && <p className="p-5 text-sm text-slate-400">Loading…</p>}
          {!spotlightLoading && (spotlight?.topOpportunities.length ?? 0) === 0 && (
            <p className="p-5 text-sm text-slate-400">No open deals yet.</p>
          )}
          {(spotlight?.topOpportunities.length ?? 0) > 0 && (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {spotlight!.topOpportunities.map((opp) => (
                <li key={opp.id}>
                  <Link href={`/active-deals/${opp.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-primary">
                        {opp.title}{" "}
                        <span className="font-normal text-slate-400">{opp.code}</span>
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {opp.customerName ?? "—"} · {label(opp.stage)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-primary">
                      {formatCurrency(opp.estimatedValue, opp.currency)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <h2 className="text-sm font-semibold text-primary">Upcoming follow-ups</h2>
            <Link href="/calendar" className="text-xs font-medium text-brand-700 hover:underline">
              {getPageLabel("/calendar")}
            </Link>
          </div>
          {spotlightLoading && <p className="p-5 text-sm text-slate-400">Loading…</p>}
          {!spotlightLoading && (spotlight?.upcomingEvents.length ?? 0) === 0 && (
            <p className="p-5 text-sm text-slate-400">No upcoming events in the next 14 days.</p>
          )}
          {(spotlight?.upcomingEvents.length ?? 0) > 0 && (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {spotlight!.upcomingEvents.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary">{event.title}</p>
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
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <h2 className="text-sm font-semibold text-primary">{getPageLabel("/pending-approvals")}</h2>
            <Link href="/pending-approvals" className="text-xs font-medium text-brand-700 hover:underline">
              Inbox
            </Link>
          </div>
          {spotlightLoading && <p className="p-5 text-sm text-slate-400">Loading…</p>}
          {!spotlightLoading && (spotlight?.pendingApprovals.length ?? 0) === 0 && (
            <p className="p-5 text-sm text-slate-400">No pending approvals.</p>
          )}
          {(spotlight?.pendingApprovals.length ?? 0) > 0 && (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {spotlight!.pendingApprovals.map((approval) => (
                <li key={approval.id}>
                  <Link href="/pending-approvals" className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-primary">
                        {approval.quotationCode ?? getPageLabel("/orders")}{" "}
                        <span className="font-normal text-slate-400">{approval.customerName ?? ""}</span>
                      </p>
                      <p className="truncate text-xs text-slate-500">{approval.reason ?? "Approval required"}</p>
                    </div>
                    {approval.grandTotal != null && approval.currency && (
                      <p className="shrink-0 text-sm font-semibold text-primary">
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
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-primary">{getPageLabel("/service-contracts")} renewals due</h2>
              <p className="text-xs text-slate-500">Contracts ending within 90 days</p>
            </div>
            <Link href="/service-contracts" className="text-xs font-medium text-brand-700 hover:underline">
              View contracts
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-5 py-2.5">Contract</th>
                <th className="px-5 py-2.5">Customer</th>
                <th className="px-5 py-2.5">Ends</th>
                <th className="px-5 py-2.5 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {spotlight!.expiringAmcs.map((contract) => (
                <tr key={contract.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50">
                  <td className="px-5 py-3">
                    <Link href={`/service-contracts/${contract.id}`} className="font-medium text-brand-600 hover:underline">
                      {contract.code}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{contract.customerName ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {new Date(contract.endDate).toLocaleDateString()}
                    <span className="ml-2 text-xs font-medium text-amber-700">({contract.daysToExpiry}d)</span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-primary">
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
