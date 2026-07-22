"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { usePortalTickets, TICKET_STATUS_TONE, TICKET_PRIORITY_TONE } from "@/lib/portal";
import { Badge, Button, Card } from "@/components/ui";

export default function PortalSupportPage() {
  const { data: tickets, isLoading, isError } = usePortalTickets();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-primary">Support Tickets</h1>
          <p className="mt-1 text-sm text-slate-500">Raise and track support requests.</p>
        </div>
        <Link href="/portal/support/new">
          <Button>
            <Plus size={16} />
            New Ticket
          </Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-8 text-sm text-slate-500">Loading tickets…</p>}
        {isError && <p className="p-8 text-sm text-red-600 dark:text-red-400">Couldn&apos;t load tickets.</p>}
        {!isLoading && !isError && (tickets?.length ?? 0) === 0 && (
          <div className="px-8 py-14 text-center">
            <p className="font-medium text-primary">No support tickets yet</p>
            <p className="mt-1 text-sm text-slate-500">Raise a ticket if you run into an issue.</p>
          </div>
        )}
        {(tickets?.length ?? 0) > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50/80 dark:bg-slate-800/50 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Opened</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {tickets!.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-brand-50/40">
                    <td className="px-4 py-3.5">
                      <Link href={`/portal/support/${t.id}`} className="font-semibold text-brand-700 hover:text-brand-800 hover:underline">
                        {t.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-primary">{t.subject}</td>
                    <td className="px-4 py-3.5">
                      <Badge tone={TICKET_PRIORITY_TONE[t.priority] ?? "slate"}>{t.priority}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3.5">
                      <Badge tone={TICKET_STATUS_TONE[t.status] ?? "slate"}>{t.status.replaceAll("_", " ")}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
