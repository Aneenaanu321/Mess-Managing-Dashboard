"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCreateTask, useAssignableUsers } from "@/lib/tasks";
import { useProjects } from "@/lib/projects";
import { Button, Input, Label, Select, Card } from "@/components/ui";
import { getNewItemLabel } from "@/lib/nav-labels";

export default function NewTaskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createTask = useCreateTask();
  const { data: projectsData } = useProjects({ page: 1 });
  const { data: assignableUsers } = useAssignableUsers();
  const projects = projectsData?.data ?? [];

  const [form, setForm] = useState({
    title: "",
    projectId: searchParams.get("projectId") ?? "",
    assigneeId: "",
    description: "",
    dueAt: "",
  });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.assigneeId) {
      setError("Choose who this task is assigned to");
      return;
    }
    try {
      const task = await createTask.mutateAsync({
        title: form.title,
        projectId: form.projectId,
        assigneeId: form.assigneeId,
        description: form.description || undefined,
        dueAt: form.dueAt || undefined,
      });
      router.push(`/team-tasks/${task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-xl font-semibold text-primary">{getNewItemLabel("/team-tasks")}</h1>
      <p className="mb-6 text-sm text-slate-500">
        The coordinator assigns a delivery or field job to a team member. They&apos;ll get a notification and can mark it done when finished.
      </p>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Task title</Label>
            <Input
              id="title"
              required
              placeholder="e.g. Install gate readers at Dubai Mall"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="projectId">Project</Label>
            <Select id="projectId" required value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              <option value="">Select project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="assigneeId">Assign to</Label>
            <Select
              id="assigneeId"
              required
              value={form.assigneeId}
              onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
            >
              <option value="">Select person…</option>
              {(assignableUsers ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} — {u.role.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="dueAt">Due date (optional)</Label>
            <Input id="dueAt" type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
          </div>

          <div>
            <Label htmlFor="description">Instructions (optional)</Label>
            <textarea
              id="description"
              rows={3}
              className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              placeholder="Site access details, equipment needed, etc."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? "Assigning…" : "Assign task"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
