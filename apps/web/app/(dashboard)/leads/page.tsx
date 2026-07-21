"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useLeads, STATUS_TONE, Lead } from "@/lib/leads";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Input, Select, Card } from "@/components/ui";

const STATUS_OPTIONS = ["", "NEW", "CONTACTED", "QUALIFIED", "DISQUALIFIED", "CONVERTED"];

export default function LeadsPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const { data: user } = useCurrentUser();
  const { data, isLoading, isError } = useLeads({ status: status || undefined, search: search || undefined });

  const leads = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">Sales</p>
          <h1 className="font-display mt-1 text-2xl font-semibold tracking-tight text-slate-900">Leads</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data?.meta?.total ?? 0} total lead{data?.meta?.total === 1 ? "" : "s"} in your pipeline
          </p>
        </div>
        {hasPermission(user, "lead:create") && (
          <Link href="/leads/new">
            <Button>
              <Plus size={16} />
              New Lead
            </Button>
          </Link>
        )}
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search company, contact, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-44">
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s || "All statuses"}
            </option>
          ))}
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-8 text-sm text-slate-500">Loading leads…</p>}
        {isError && (
          <p className="p-8 text-sm text-red-600">
            Couldn&apos;t load leads. Is the API running at <code>NEXT_PUBLIC_API_URL</code>?
          </p>
        )}
        {!isLoading && !isError && leads.length === 0 && (
          <div className="px-8 py-14 text-center">
            <p className="font-medium text-slate-800">No leads match these filters</p>
            <p className="mt-1 text-sm text-slate-500">Try another search, or create a new lead to get started.</p>
          </div>
        )}
        {leads.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Industry</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead: Lead) => (
                  <tr key={lead.id} className="transition-colors hover:bg-brand-50/40">
                    <td className="px-4 py-3.5">
                      <Link href={`/leads/${lead.id}`} className="font-semibold text-brand-700 hover:text-brand-800 hover:underline">
                        {lead.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">{lead.companyName}</td>
                    <td className="px-4 py-3.5 text-slate-600">{lead.contactName}</td>
                    <td className="px-4 py-3.5 text-slate-600">{lead.source.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3.5 text-slate-600">{lead.industry}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={
                          lead.score >= 70
                            ? "inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                            : "text-slate-600"
                        }
                      >
                        {lead.score}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {lead.owner ? `${lead.owner.firstName} ${lead.owner.lastName}` : <span className="text-slate-400">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={STATUS_TONE[lead.status]}>{lead.status}</Badge>
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
