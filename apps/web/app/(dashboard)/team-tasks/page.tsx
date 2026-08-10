"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import {
  useTasks,
  useDeleteTask,
  TASK_STATUSES,
  TASK_STATUS_TONE,
  TASK_STATUS_LABELS,
  TASK_JOB_LABELS,
  EngineerTask,
} from "@/lib/tasks";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Input, Select, Card } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { getPageLabel } from "@/lib/nav-labels";

type ViewFilter = "all" | "mine" | "assignedByMe" | "awaitingVerify";

export default function TasksPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewFilter>("all");
  const { data: user } = useCurrentUser();
  const deleteTask = useDeleteTask();
  const confirm = useConfirm();
  const { data, isLoading, isError } = useTasks({
    status: status || undefined,
    search: search || undefined,
    mine: view === "mine",
    assignedByMe: view === "assignedByMe",
    awaitingVerify: view === "awaitingVerify",
  });

  const tasks = data?.data ?? [];
  const canManage = hasPermission(user, "task:update") && user?.role?.key !== "DELIVERY_PERSON";

  async function handleDelete(task: EngineerTask) {
    const ok = await confirm({
      title: "Delete this job?",
      message: `"${task.title}" will be permanently removed. The assignee will be notified.`,
      confirmLabel: "Delete job",
      variant: "danger",
    });
    if (!ok) return;
    await deleteTask.mutateAsync(task.id);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-primary">{getPageLabel("/team-tasks")}</h1>
          <p className="text-sm text-slate-500">
            Assign → seen → SOP + docs → submit → verify. Day board:{" "}
            <Link href="/field-ops" className="text-brand-700 hover:underline dark:text-brand-400">
              Field Ops
            </Link>
            . {data?.meta?.total ?? 0} job
            {data?.meta?.total === 1 ? "" : "s"} shown.
          </p>
        </div>
        {canManage && (
          <Link href="/team-tasks/new">
            <Button>+ Assign Job</Button>
          </Link>
        )}
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="flex flex-wrap rounded-xl border border-slate-200 p-0.5 dark:border-slate-700">
          {(
            [
              ["all", "All jobs"],
              ["mine", "My jobs"],
              ["assignedByMe", "Assigned by me"],
              ["awaitingVerify", "Awaiting verify"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                view === key
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Input placeholder="Search title..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
          <option value="">All statuses</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {TASK_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-6 text-sm text-slate-500">Loading tasks…</p>}
        {isError && <p className="p-6 text-sm text-red-600 dark:text-red-400">Couldn&apos;t load tasks.</p>}
        {!isLoading && !isError && tasks.length === 0 && (
          <p className="p-6 text-sm text-slate-500">No tasks match these filters yet.</p>
        )}
        {tasks.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-2.5">Title</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Project</th>
                <th className="px-4 py-2.5">Assignee</th>
                <th className="px-4 py-2.5">Assigned by</th>
                <th className="px-4 py-2.5">Due</th>
                <th className="px-4 py-2.5">Status</th>
                {canManage && <th className="px-4 py-2.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {tasks.map((t: EngineerTask) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/team-tasks/${t.id}`} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {TASK_JOB_LABELS[t.jobType] ?? t.jobType}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{t.project?.code ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : <span className="text-slate-400">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {t.createdBy ? `${t.createdBy.firstName} ${t.createdBy.lastName}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={TASK_STATUS_TONE[t.status]}>{TASK_STATUS_LABELS[t.status]}</Badge>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                        disabled={deleteTask.isPending}
                        onClick={() => handleDelete(t)}
                        aria-label={`Delete ${t.title}`}
                      >
                        <Trash2 size={14} />
                        Delete
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

