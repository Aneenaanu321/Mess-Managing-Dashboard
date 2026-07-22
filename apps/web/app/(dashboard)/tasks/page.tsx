"use client";

import { useState } from "react";
import Link from "next/link";
import { useTasks, TASK_STATUSES, TASK_STATUS_TONE, EngineerTask } from "@/lib/tasks";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Input, Select, Card } from "@/components/ui";

export default function TasksPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const { data: user } = useCurrentUser();
  const { data, isLoading, isError } = useTasks({ status: status || undefined, search: search || undefined });

  const tasks = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary">Engineer Tasks</h1>
          <p className="text-sm text-slate-500">
            {data?.meta?.total ?? 0} task{data?.meta?.total === 1 ? "" : "s"}
          </p>
        </div>
        {hasPermission(user, "task:update") && (
          <Link href="/tasks/new">
            <Button>+ New Task</Button>
          </Link>
        )}
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <Input placeholder="Search title..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
          <option value="">All statuses</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-6 text-sm text-slate-500">Loading tasks…</p>}
        {isError && <p className="p-6 text-sm text-red-600 dark:text-red-400">Couldn&apos;t load tasks.</p>}
        {!isLoading && !isError && tasks.length === 0 && <p className="p-6 text-sm text-slate-500">No tasks match these filters yet.</p>}
        {tasks.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Title</th>
                <th className="px-4 py-2.5">Project</th>
                <th className="px-4 py-2.5">Assignee</th>
                <th className="px-4 py-2.5">Due</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {tasks.map((t: EngineerTask) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/tasks/${t.id}`} className="font-medium text-brand-600 hover:underline">
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.project?.code ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : <span className="text-slate-400">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={TASK_STATUS_TONE[t.status]}>{t.status.replaceAll("_", " ")}</Badge>
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
