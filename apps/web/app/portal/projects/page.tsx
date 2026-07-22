"use client";

import Link from "next/link";
import { usePortalProjects, PROJECT_STATUS_TONE } from "@/lib/portal";
import { Badge, Card } from "@/components/ui";

export default function PortalProjectsPage() {
  const { data: projects, isLoading, isError } = usePortalProjects();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-primary">Projects</h1>
        <p className="mt-1 text-sm text-slate-500">Implementation progress for your deployments.</p>
      </div>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-8 text-sm text-slate-500">Loading projects…</p>}
        {isError && <p className="p-8 text-sm text-red-600 dark:text-red-400">Couldn&apos;t load projects.</p>}
        {!isLoading && !isError && (projects?.length ?? 0) === 0 && (
          <div className="px-8 py-14 text-center">
            <p className="font-medium text-primary">No projects yet</p>
          </div>
        )}
        {(projects?.length ?? 0) > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50/80 dark:bg-slate-800/50 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3">Planned Go-Live</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {projects!.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-brand-50/40">
                    <td className="px-4 py-3.5">
                      <Link href={`/portal/projects/${p.id}`} className="font-semibold text-brand-700 hover:text-brand-800 hover:underline">
                        {p.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-primary">{p.name}</td>
                    <td className="px-4 py-3.5 text-slate-600">{p.site ? `${p.site.label}${p.site.city ? `, ${p.site.city}` : ""}` : "—"}</td>
                    <td className="px-4 py-3.5 text-slate-600">{p.plannedGoLiveDate ? new Date(p.plannedGoLiveDate).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3.5">
                      <Badge tone={PROJECT_STATUS_TONE[p.status] ?? "slate"}>{p.status.replaceAll("_", " ")}</Badge>
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
