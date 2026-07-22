"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useProject,
  useUpdateProject,
  useUpdateMilestone,
  PROJECT_STATUSES,
  MILESTONE_LABELS,
  STATUS_TONE,
  MILESTONE_STATUS_TONE,
  MilestoneStatus,
} from "@/lib/projects";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Card, Select } from "@/components/ui";

const MILESTONE_STATUSES: MilestoneStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETE", "BLOCKED"];

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: project, isLoading } = useProject(params.id);
  const { data: user } = useCurrentUser();
  const updateProject = useUpdateProject();
  const updateMilestone = useUpdateMilestone();
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!project) return <p className="text-sm text-slate-500">Project not found.</p>;

  const canManage = hasPermission(user, "project:manage");

  async function handleStatusChange(status: string) {
    setError(null);
    try {
      await updateProject.mutateAsync({ id: project!.id, input: { status: status as never } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function handleMilestoneStatus(milestoneId: string, status: MilestoneStatus) {
    setError(null);
    try {
      await updateMilestone.mutateAsync({ projectId: project!.id, milestoneId, input: { status } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update milestone");
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{project.code}</p>
          <h1 className="text-xl font-semibold text-primary">{project.name}</h1>
          <p className="text-sm text-slate-500">{project.customer?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage ? (
            <Select value={project.status} onChange={(e) => handleStatusChange(e.target.value)} className="w-56">
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          ) : (
            <Badge tone={STATUS_TONE[project.status]}>{project.status.replaceAll("_", " ")}</Badge>
          )}
        </div>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Details</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Customer" value={project.customer?.name ?? "—"} />
            <Row label="Site" value={project.site?.label ?? "—"} />
            <Row label="Sales Order" value={project.salesOrder?.code ?? "—"} />
            <Row label="Deal" value={project.opportunity?.title ?? "—"} />
            <Row label="Manager" value={project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : "Unassigned"} />
            <Row label="Planned Go-Live" value={project.plannedGoLiveDate ? new Date(project.plannedGoLiveDate).toLocaleDateString() : "—"} />
            <Row label="Actual Go-Live" value={project.actualGoLiveDate ? new Date(project.actualGoLiveDate).toLocaleDateString() : "—"} />
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Devices</h2>
          {project.devices?.length ? (
            <ul className="space-y-1.5 text-sm">
              {project.devices.map((d) => (
                <li key={d.id} className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5">
                  <Link href={`/installed-equipment/${d.id}`} className="text-brand-600 hover:underline">
                    {d.serialNumber}
                  </Link>
                  <span className="text-slate-500">{d.type}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No devices linked yet.</p>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">Milestones</h2>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {project.milestones?.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-primary">{MILESTONE_LABELS[m.key]}</p>
                {m.completedAt && <p className="text-xs text-slate-400">Completed {new Date(m.completedAt).toLocaleDateString()}</p>}
              </div>
              {canManage ? (
                <Select
                  value={m.status}
                  onChange={(e) => handleMilestoneStatus(m.id, e.target.value as MilestoneStatus)}
                  className="w-40"
                >
                  {MILESTONE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              ) : (
                <Badge tone={MILESTONE_STATUS_TONE[m.status]}>{m.status.replaceAll("_", " ")}</Badge>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-primary">Engineer Tasks</h2>
          <Link href={`/team-tasks/new?projectId=${project.id}`} className="text-sm text-brand-600 hover:underline">
            + Add task
          </Link>
        </div>
        {project.tasks?.length ? (
          <ul className="space-y-1.5 text-sm">
            {project.tasks.map((t) => (
              <li key={t.id} className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5">
                <Link href={`/team-tasks/${t.id}`} className="text-brand-600 hover:underline">
                  {t.title}
                </Link>
                <span className="text-slate-500">{t.status.replaceAll("_", " ")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No engineer tasks yet.</p>
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
