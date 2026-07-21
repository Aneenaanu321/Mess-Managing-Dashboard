"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCreateTask } from "@/lib/tasks";
import { useProjects } from "@/lib/projects";
import { Button, Input, Label, Select, Card } from "@/components/ui";

export default function NewTaskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createTask = useCreateTask();
  const { data: projectsData } = useProjects({ page: 1 });
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
    try {
      const task = await createTask.mutateAsync({
        title: form.title,
        projectId: form.projectId,
        assigneeId: form.assigneeId || undefined,
        description: form.description || undefined,
        dueAt: form.dueAt || undefined,
      });
      router.push(`/tasks/${task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">New Engineer Task</h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assigneeId">Assignee (user ID, optional)</Label>
              <Input id="assigneeId" value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="dueAt">Due date (optional)</Label>
              <Input id="dueAt" type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <textarea
              id="description"
              rows={3}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? "Creating…" : "Create Task"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
