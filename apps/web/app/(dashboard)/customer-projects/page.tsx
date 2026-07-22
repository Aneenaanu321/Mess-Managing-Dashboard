"use client";

import { useState } from "react";
import Link from "next/link";
import { useProjects, PROJECT_STATUSES, STATUS_TONE, Project } from "@/lib/projects";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Input, Select, Card } from "@/components/ui";
import { getNewItemLabel, getPageLabel } from "@/lib/nav-labels";

export default function ProjectsPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const { data: user } = useCurrentUser();
  const { data, isLoading, isError } = useProjects({ status: status || undefined, search: search || undefined });

  const projects = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary">{getPageLabel("/customer-projects")}</h1>
          <p className="text-sm text-slate-500">
            {data?.meta?.total ?? 0} total project{data?.meta?.total === 1 ? "" : "s"}
          </p>
        </div>
        {hasPermission(user, "project:manage") && (
          <Link href="/customer-projects/new">
            <Button>+ {getNewItemLabel("/customer-projects")}</Button>
          </Link>
        )}
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <Input placeholder="Search name or code..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-6 text-sm text-slate-500">Loading projects…</p>}
        {isError && <p className="p-6 text-sm text-red-600 dark:text-red-400">Couldn&apos;t load projects.</p>}
        {!isLoading && !isError && projects.length === 0 && (
          <p className="p-6 text-sm text-slate-500">No projects match these filters yet.</p>
        )}
        {projects.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Manager</th>
                <th className="px-4 py-2.5">Planned Go-Live</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {projects.map((p: Project) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/customer-projects/${p.id}`} className="font-medium text-brand-600 hover:underline">
                      {p.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-primary">{p.name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.customer?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.manager ? `${p.manager.firstName} ${p.manager.lastName}` : <span className="text-slate-400">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.plannedGoLiveDate ? new Date(p.plannedGoLiveDate).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[p.status]}>{p.status.replaceAll("_", " ")}</Badge>
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
