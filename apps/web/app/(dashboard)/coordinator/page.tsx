"use client";

import Link from "next/link";
import { useCoordinatorWorklist, useCoordinatorMetrics, useShiftHandovers, useCreateHandover, useSnoozeFollowUp } from "@/lib/sales-ops";
import { Badge, Button, Card, Input } from "@/components/ui";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";

function Tile({ label, value, href, tone = "slate" }: { label: string; value: number; href?: string; tone?: "slate" | "amber" | "red" | "blue" }) {
  const inner = (
    <Card className="p-4 transition hover:border-brand-300">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-primary">{value}</p>
      {tone !== "slate" && value > 0 && <Badge tone={tone} className="mt-2">Needs attention</Badge>}
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function CoordinatorPage() {
  const { data, isLoading, isError } = useCoordinatorWorklist();
  const { data: metrics } = useCoordinatorMetrics();
  const { data: handovers } = useShiftHandovers();
  const createHandover = useCreateHandover();
  const snooze = useSnoozeFollowUp();
  const [note, setNote] = useState("");

  const counts = data?.counts;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales Ops"
        title="Coordinator"
        description="Worklist for unassigned leads, SLA breaches, quote chase, POs, and handoffs."
      />

      {isError && <Card className="p-4 text-sm text-red-600">Couldn&apos;t load worklist.</Card>}
      {isLoading && <p className="text-sm text-muted">Loading…</p>}

      {counts && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Tile label="Unassigned leads" value={counts.unassignedLeads} href="/new-inquiries?unassigned=1" tone="amber" />
          <Tile label="SLA breached" value={counts.slaBreachedLeads} href="/new-inquiries?slaBreached=1" tone="red" />
          <Tile label="Overdue follow-ups" value={counts.overdueFollowUps} href="/calendar" tone="amber" />
          <Tile label="Quotes to chase" value={counts.quotesToChase} href="/orders" tone="amber" />
          <Tile label="Quotes pending send" value={counts.quotesPendingSend} href="/orders" />
          <Tile label="POs awaiting verify" value={counts.posAwaitingVerify} href="/customer-orders" tone="blue" />
          <Tile label="Stuck approvals" value={counts.stuckApprovals} href="/pending-approvals" tone="red" />
          <Tile label="Stale deals (7d+)" value={counts.staleOpportunities7} href="/active-deals" tone="amber" />
          <Tile label="Open handoffs" value={counts.openHandoffs ?? 0} href="/handoffs" tone="blue" />
        </div>
      )}

      {metrics && (
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Performance (30 days)</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-muted">Avg hours to first contact</p>
              <p className="text-lg font-semibold text-primary">{metrics.avgHoursToFirstContact ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted">Avg hours quote → send</p>
              <p className="text-lg font-semibold text-primary">{metrics.avgHoursQuoteToSend ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted">Avg hours PO → verify</p>
              <p className="text-lg font-semibold text-primary">{metrics.avgHoursPoToVerify ?? "—"}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 p-4 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-primary">Unassigned leads</h2>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {(data?.unassignedLeads ?? []).slice(0, 8).map((l: any) => (
              <li key={l.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <Link href={`/new-inquiries/${l.id}`} className="font-medium text-brand-700 hover:underline dark:text-brand-400">
                  {l.code} — {l.companyName}
                </Link>
                <span className="text-muted">{new Date(l.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
            {(data?.unassignedLeads ?? []).length === 0 && <li className="p-4 text-sm text-muted">None</li>}
          </ul>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 p-4 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-primary">Quotes to chase</h2>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {(data?.quotesToChase ?? []).slice(0, 8).map((q: any) => (
              <li key={q.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <Link href={`/orders/${q.id}`} className="font-medium text-brand-700 hover:underline dark:text-brand-400">
                  {q.code} — {q.customer?.name}
                </Link>
                <span className="text-muted">Sent {q.sentAt ? new Date(q.sentAt).toLocaleDateString() : "—"}</span>
              </li>
            ))}
            {(data?.quotesToChase ?? []).length === 0 && <li className="p-4 text-sm text-muted">None</li>}
          </ul>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 p-4 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-primary">Overdue follow-ups</h2>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {(data?.overdueFollowUps ?? []).slice(0, 8).map((e: any) => (
              <li key={e.id} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-primary">{e.title}</p>
                  <p className="text-xs text-muted">{new Date(e.startAt).toLocaleString()}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const next = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                    snooze.mutate({ id: e.id, startAt: next });
                  }}
                >
                  Snooze 1d
                </Button>
              </li>
            ))}
            {(data?.overdueFollowUps ?? []).length === 0 && <li className="p-4 text-sm text-muted">None</li>}
          </ul>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 p-4 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-primary">Stale opportunities</h2>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {(data?.staleOpportunities ?? []).slice(0, 8).map((o: any) => (
              <li key={o.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <Link href={`/active-deals/${o.id}`} className="font-medium text-brand-700 hover:underline dark:text-brand-400">
                  {o.code} — {o.title}
                </Link>
                <Badge tone="amber">{o.stage?.replaceAll("_", " ")}</Badge>
              </li>
            ))}
            {(data?.staleOpportunities ?? []).length === 0 && <li className="p-4 text-sm text-muted">None</li>}
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">Shift handover notes</h2>
        <div className="mb-3 flex gap-2">
          <Input
            placeholder="End-of-day summary for the next shift…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            disabled={!note.trim() || createHandover.isPending}
            onClick={async () => {
              await createHandover.mutateAsync(note.trim());
              setNote("");
            }}
          >
            Save
          </Button>
        </div>
        <ul className="space-y-2 text-sm">
          {(handovers ?? []).slice(0, 5).map((h: any) => (
            <li key={h.id} className="rounded-lg border border-slate-100 p-3 dark:border-slate-700">
              <p className="text-primary">{h.body}</p>
              <p className="mt-1 text-xs text-muted">
                {h.author?.firstName} {h.author?.lastName} · {new Date(h.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
