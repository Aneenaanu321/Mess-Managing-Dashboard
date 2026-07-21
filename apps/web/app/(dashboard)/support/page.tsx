"use client";

import { useState } from "react";
import Link from "next/link";
import { useTickets, TICKET_STATUSES, TICKET_PRIORITIES, TICKET_STATUS_TONE, TICKET_PRIORITY_TONE, Ticket } from "@/lib/support";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Input, Select, Card } from "@/components/ui";

export default function SupportPage() {
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState("");
  const { data: user } = useCurrentUser();
  const { data, isLoading, isError } = useTickets({ status: status || undefined, priority: priority || undefined, search: search || undefined });

  const tickets = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Support Tickets</h1>
          <p className="text-sm text-slate-500">
            {data?.meta?.total ?? 0} ticket{data?.meta?.total === 1 ? "" : "s"}
          </p>
        </div>
        {hasPermission(user, "support:manage") && (
          <Link href="/support/new">
            <Button>+ New Ticket</Button>
          </Link>
        )}
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <Input placeholder="Search subject or code..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
          <option value="">All statuses</option>
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
        <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="max-w-xs">
          <option value="">All priorities</option>
          {TICKET_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-6 text-sm text-slate-500">Loading tickets…</p>}
        {isError && <p className="p-6 text-sm text-red-600">Couldn&apos;t load tickets.</p>}
        {!isLoading && !isError && tickets.length === 0 && <p className="p-6 text-sm text-slate-500">No tickets match these filters yet.</p>}
        {tickets.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Subject</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Priority</th>
                <th className="px-4 py-2.5">Assignee</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map((t: Ticket) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/support/${t.id}`} className="font-medium text-brand-600 hover:underline">
                      {t.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-900">{t.subject}</td>
                  <td className="px-4 py-3 text-slate-600">{t.customer?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={TICKET_PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : <span className="text-slate-400">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={TICKET_STATUS_TONE[t.status]}>{t.status.replaceAll("_", " ")}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
