"use client";

import { useState } from "react";
import Link from "next/link";
import { useInstallations } from "@/lib/installations";
import { STATUS_TONE } from "@/lib/projects";
import { Badge, Input, Card } from "@/components/ui";

export default function InstallationsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useInstallations({ search: search || undefined });

  const projects = data?.data ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Installations</h1>
        <p className="text-sm text-slate-500">
          Projects currently in the field — engineer assignment through go-live. {data?.meta?.total ?? 0} in progress.
        </p>
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <Input placeholder="Search project name or code..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
      </Card>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-6 text-sm text-slate-500">Loading installations…</p>}
        {isError && <p className="p-6 text-sm text-red-600">Couldn&apos;t load installations.</p>}
        {!isLoading && !isError && projects.length === 0 && (
          <p className="p-6 text-sm text-slate-500">No projects are currently in an installation phase.</p>
        )}
        {projects.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Project</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Manager</th>
                <th className="px-4 py-2.5">Milestones Complete</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((p) => {
                const complete = p.milestones?.filter((m) => m.status === "COMPLETE").length ?? 0;
                const totalMilestones = p.milestones?.length ?? 0;
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/projects/${p.id}`} className="font-medium text-brand-600 hover:underline">
                        {p.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-900">{p.name}</td>
                    <td className="px-4 py-3 text-slate-600">{p.customer?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.manager ? `${p.manager.firstName} ${p.manager.lastName}` : <span className="text-slate-400">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {complete}/{totalMilestones}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[p.status]}>{p.status.replaceAll("_", " ")}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
