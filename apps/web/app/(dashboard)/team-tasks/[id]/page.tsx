"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  useTask,
  useUpdateTask,
  useAssignableUsers,
  TASK_STATUSES,
  TASK_STATUS_TONE,
  TASK_STATUS_LABELS,
  TaskStatus,
} from "@/lib/tasks";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Card, Select } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: task, isLoading } = useTask(params.id);
  const { data: user } = useCurrentUser();
  const { data: assignableUsers } = useAssignableUsers();
  const updateTask = useUpdateTask();
  const confirm = useConfirm();
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!task) return <p className="text-sm text-slate-500">Task not found.</p>;

  const canManage = hasPermission(user, "task:update");
  const isAssignee = user?.id === task.assignee?.id;
  const isDone = task.status === "DONE";

  async function handleStatusChange(status: string) {
    setError(null);
    try {
      await updateTask.mutateAsync({ id: task!.id, input: { status: status as TaskStatus } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    }
  }

  async function handleMarkDone() {
    const ok = await confirm({
      title: "Mark task as done?",
      message: "This closes the job and notifies the coordinator who assigned it.",
      confirmLabel: "Mark done",
      variant: "primary",
    });
    if (!ok) return;
    await handleStatusChange("DONE");
  }

  async function handleAssigneeChange(assigneeId: string) {
    setError(null);
    try {
      await updateTask.mutateAsync({ id: task!.id, input: { assigneeId: assigneeId || undefined } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reassign task");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-400">
            <Link href={`/customer-projects/${task.project.id}`} className="hover:underline">
              {task.project.code}
            </Link>
          </p>
          <h1 className="text-xl font-semibold text-primary">{task.title}</h1>
          {task.createdBy && (
            <p className="mt-1 text-sm text-slate-500">
              Assigned by {task.createdBy.firstName} {task.createdBy.lastName}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={TASK_STATUS_TONE[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
          {isAssignee && !isDone && (
            <Button size="sm" onClick={handleMarkDone} disabled={updateTask.isPending}>
              <CheckCircle2 size={16} />
              Mark as done
            </Button>
          )}
          {canManage && !isAssignee && (
            <Select value={task.status} onChange={(e) => handleStatusChange(e.target.value)} className="w-40">
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TASK_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>
      )}

      <Card className="p-5">
        <dl className="space-y-2 text-sm">
          <Row label="Project" value={task.project?.name ?? "—"} />
          <Row
            label="Assignee"
            value={
              canManage ? (
                <Select
                  value={task.assignee?.id ?? ""}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="max-w-xs"
                >
                  <option value="">Unassigned</option>
                  {(assignableUsers ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} — {u.role.name}
                    </option>
                  ))}
                </Select>
              ) : task.assignee ? (
                `${task.assignee.firstName} ${task.assignee.lastName}`
              ) : (
                "Unassigned"
              )
            }
          />
          <Row label="Due" value={task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"} />
          <Row label="Completed" value={task.completedAt ? new Date(task.completedAt).toLocaleString() : "—"} />
        </dl>
        {task.description && (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-700">
            <p className="mb-1 text-xs font-medium uppercase text-slate-400">Instructions</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{task.description}</p>
          </div>
        )}
      </Card>

      {isDone && task.createdBy && (
        <p className="mt-4 text-center text-sm text-emerald-700 dark:text-emerald-400">
          Completed — {task.createdBy.firstName} was notified.
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-700">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-primary">{value}</dd>
    </div>
  );
}
