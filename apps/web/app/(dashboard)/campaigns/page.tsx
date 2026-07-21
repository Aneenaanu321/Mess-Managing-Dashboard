"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useCampaigns, Campaign } from "@/lib/campaigns";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Button, Card, Input } from "@/components/ui";

export default function CampaignsPage() {
  const [search, setSearch] = useState("");
  const { data: user } = useCurrentUser();
  const { data, isLoading, isError } = useCampaigns({ search: search || undefined });
  const campaigns = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">Marketing</p>
          <h1 className="font-display mt-1 text-2xl font-semibold tracking-tight text-slate-900">Campaigns</h1>
          <p className="mt-1 text-sm text-slate-500">Track lead attribution back to the campaign that generated it.</p>
        </div>
        {hasPermission(user, "campaign:manage") && (
          <Link href="/campaigns/new">
            <Button>
              <Plus size={16} />
              New Campaign
            </Button>
          </Link>
        )}
      </div>

      <Card className="flex items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search name or channel..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-8 text-sm text-slate-500">Loading campaigns…</p>}
        {isError && <p className="p-8 text-sm text-red-600">Couldn&apos;t load campaigns.</p>}
        {!isLoading && !isError && campaigns.length === 0 && (
          <div className="px-8 py-14 text-center">
            <p className="font-medium text-slate-800">No campaigns yet</p>
            <p className="mt-1 text-sm text-slate-500">Create one to start attributing leads to it.</p>
          </div>
        )}
        {campaigns.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Window</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Leads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((c: Campaign) => (
                <tr key={c.id} className="transition-colors hover:bg-brand-50/40">
                  <td className="px-4 py-3.5">
                    <Link href={`/campaigns/${c.id}`} className="font-semibold text-brand-700 hover:text-brand-800 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{c.channel}</td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {c.startDate ? new Date(c.startDate).toLocaleDateString() : "—"}
                    {c.endDate ? ` – ${new Date(c.endDate).toLocaleDateString()}` : ""}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{c.budget ? Number(c.budget).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3.5 text-slate-600">{c._count?.leads ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
