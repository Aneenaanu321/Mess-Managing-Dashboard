"use client";

import { useParams } from "next/navigation";
import { usePortalProject, PROJECT_STATUS_TONE, MILESTONE_STATUS_TONE } from "@/lib/portal";
import { Badge, Card } from "@/components/ui";

export default function PortalProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: project, isLoading } = usePortalProject(params.id);

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!project) return <p className="text-sm text-slate-500">Project not found.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{project.code}</p>
          <h1 className="text-xl font-semibold text-primary">{project.name}</h1>
          {project.site && (
            <p className="text-sm text-slate-500">
              {project.site.label}
              {project.site.city ? `, ${project.site.city}` : ""}
              {project.site.country ? `, ${project.site.country}` : ""}
            </p>
          )}
        </div>
        <Badge tone={PROJECT_STATUS_TONE[project.status] ?? "slate"}>{project.status.replaceAll("_", " ")}</Badge>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">Details</h2>
        <dl className="space-y-2 text-sm">
          <Row label="Manager" value={project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : "Unassigned"} />
          <Row label="Planned Go-Live" value={project.plannedGoLiveDate ? new Date(project.plannedGoLiveDate).toLocaleDateString() : "—"} />
          <Row label="Actual Go-Live" value={project.actualGoLiveDate ? new Date(project.actualGoLiveDate).toLocaleDateString() : "—"} />
        </dl>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">Milestones</h2>
        {project.milestones.length === 0 ? (
          <p className="text-sm text-slate-500">No milestones recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {project.milestones.map((m) => (
              <li key={m.id} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 py-2 text-sm last:border-0">
                <span className="font-medium text-primary">{m.key.replaceAll("_", " ")}</span>
                <div className="flex items-center gap-3">
                  {m.dueDate && <span className="text-xs text-slate-500">Due {new Date(m.dueDate).toLocaleDateString()}</span>}
                  <Badge tone={MILESTONE_STATUS_TONE[m.status] ?? "slate"}>{m.status.replaceAll("_", " ")}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-primary">{value}</dd>
    </div>
  );
}
