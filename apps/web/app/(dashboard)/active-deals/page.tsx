"use client";

import { useState } from "react";
import Link from "next/link";
import { useOpportunities, OPPORTUNITY_STAGES, STAGE_TONE, Opportunity } from "@/lib/opportunities";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Input, Select, Card } from "@/components/ui";
import { getNewItemLabel, getPageLabel, getSectionForPage } from "@/lib/nav-labels";

export default function OpportunitiesPage() {
  const [stage, setStage] = useState("");
  const [search, setSearch] = useState("");
  const { data: user } = useCurrentUser();
  const { data, isLoading, isError } = useOpportunities({ stage: stage || undefined, search: search || undefined });

  const opportunities = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary">{getPageLabel("/active-deals")}</h1>
          <p className="text-sm text-slate-500">
            {data?.meta?.total ?? 0} total deal{data?.meta?.total === 1 ? "" : "s"}
          </p>
        </div>
        {hasPermission(user, "opportunity:create") && (
          <Link href="/active-deals/new">
            <Button>+ {getNewItemLabel("/active-deals")}</Button>
          </Link>
        )}
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <Input
          placeholder="Search title, code, customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={stage} onChange={(e) => setStage(e.target.value)} className="max-w-xs">
          <option value="">All stages</option>
          {OPPORTUNITY_STAGES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-6 text-sm text-slate-500">Loading deals…</p>}
        {isError && (
          <p className="p-6 text-sm text-red-600 dark:text-red-400">
            Couldn&apos;t load deals. Is the API running at <code>NEXT_PUBLIC_API_URL</code>?
          </p>
        )}
        {!isLoading && !isError && opportunities.length === 0 && (
          <p className="p-6 text-sm text-slate-500">No deals match these filters yet.</p>
        )}
        {opportunities.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Title</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Value</th>
                <th className="px-4 py-2.5">Owner</th>
                <th className="px-4 py-2.5">Expected close</th>
                <th className="px-4 py-2.5">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {opportunities.map((opp: Opportunity) => (
                <tr key={opp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/active-deals/${opp.id}`} className="font-medium text-brand-600 hover:underline">
                      {opp.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-primary">{opp.title}</td>
                  <td className="px-4 py-3 text-slate-600">{opp.customer?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {opp.currency} {Number(opp.estimatedValue).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {opp.owner ? `${opp.owner.firstName} ${opp.owner.lastName}` : <span className="text-slate-400">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STAGE_TONE[opp.stage]}>{opp.stage.replaceAll("_", " ")}</Badge>
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
