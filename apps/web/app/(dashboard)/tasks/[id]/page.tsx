"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useTask, useUpdateTask, TASK_STATUSES, TASK_STATUS_TONE, TaskStatus } from "@/lib/tasks";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Card, Select } from "@/components/ui";

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: task, isLoading } = useTask(params.id);
  const { data: user } = useCurrentUser();
  const updateTask = useUpdateTask();
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!task) return <p className="text-sm text-slate-500">Task not found.</p>;

  const canUpdate = hasPermission(user, "task:update");

  async function handleStatusChange(status: string) {
    setError(null);
    try {
      await updateTask.mutateAsync({ id: task!.id, input: { status: status as TaskStatus } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">
            <Link href={`/projects/${task.project.id}`} className="hover:underline">
              {task.project.code}
            </Link>
          </p>
          <h1 className="text-xl font-semibold text-slate-900">{task.title}</h1>
        </div>
        {canUpdate ? (
          <Select value={task.status} onChange={(e) => handleStatusChange(e.target.value)} className="w-40">
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
        ) : (
          <Badge tone={TASK_STATUS_TONE[task.status]}>{task.status.replaceAll("_", " ")}</Badge>
        )}
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Card className="p-5">
        <dl className="space-y-2 text-sm">
          <Row label="Project" value={task.project?.name ?? "—"} />
          <Row label="Assignee" value={task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : "Unassigned"} />
          <Row label="Due" value={task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"} />
          <Row label="Completed" value={task.completedAt ? new Date(task.completedAt).toLocaleDateString() : "—"} />
        </dl>
        {task.description && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-1 text-xs font-medium uppercase text-slate-400">Description</p>
            <p className="text-sm text-slate-700">{task.description}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
