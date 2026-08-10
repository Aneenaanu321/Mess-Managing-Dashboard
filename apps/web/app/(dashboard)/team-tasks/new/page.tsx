"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCreateTask,
  useAssignableUsers,
  useTaskLinkOptions,
  TASK_JOB_TYPES,
  TASK_JOB_LABELS,
  TaskJobType,
} from "@/lib/tasks";
import { useProjects } from "@/lib/projects";
import { Button, Input, Label, Select, Card } from "@/components/ui";
import { getNewItemLabel } from "@/lib/nav-labels";

export default function NewTaskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createTask = useCreateTask();
  const { data: projectsData } = useProjects({ page: 1 });
  const { data: assignableUsers } = useAssignableUsers();
  const { data: linkOptions } = useTaskLinkOptions();
  const projects = projectsData?.data ?? [];

  const todayLocal = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const [form, setForm] = useState({
    title: "",
    projectId: searchParams.get("projectId") ?? "",
    salesOrderId: searchParams.get("salesOrderId") ?? "",
    customerPoId: searchParams.get("customerPoId") ?? "",
    invoiceId: searchParams.get("invoiceId") ?? "",
    assigneeId: "",
    description: "",
    dueAt: todayLocal,
    jobType: (searchParams.get("jobType") as TaskJobType) || ("DELIVERY" as TaskJobType),
    recurring: false,
    cadence: "WEEKLY" as "WEEKLY" | "BIWEEKLY" | "MONTHLY",
  });
  const [error, setError] = useState<string | null>(null);

  const selectedSo = useMemo(
    () => linkOptions?.salesOrders.find((s) => s.id === form.salesOrderId) ?? null,
    [linkOptions, form.salesOrderId],
  );
  const selectedPo = useMemo(
    () => linkOptions?.customerPos.find((p) => p.id === form.customerPoId) ?? null,
    [linkOptions, form.customerPoId],
  );
  const selectedInv = useMemo(
    () => linkOptions?.invoices.find((i) => i.id === form.invoiceId) ?? null,
    [linkOptions, form.invoiceId],
  );

  function applySalesOrder(salesOrderId: string) {
    const so = linkOptions?.salesOrders.find((s) => s.id === salesOrderId);
    setForm((prev) => ({
      ...prev,
      salesOrderId,
      customerPoId: so?.customerPOId || prev.customerPoId,
      projectId: so?.project?.id || prev.projectId,
      title:
        prev.title.trim() ||
        (so ? `Delivery — ${so.code} (${so.customer.name})` : prev.title),
    }));
  }

  function applyCustomerPo(customerPoId: string) {
    const po = linkOptions?.customerPos.find((p) => p.id === customerPoId);
    setForm((prev) => ({
      ...prev,
      customerPoId,
      salesOrderId: po?.salesOrder?.id || prev.salesOrderId,
      title:
        prev.title.trim() ||
        (po ? `Fulfil PO ${po.poNumber} — ${po.customer.name}` : prev.title),
    }));
  }

  function applyInvoice(invoiceId: string) {
    const inv = linkOptions?.invoices.find((i) => i.id === invoiceId);
    setForm((prev) => ({
      ...prev,
      invoiceId,
      salesOrderId: inv?.salesOrderId || prev.salesOrderId,
      projectId: inv?.projectId || prev.projectId,
      jobType: prev.jobType === "OTHER" || prev.jobType === "DELIVERY" ? "CHEQUE_COLLECTION" : prev.jobType,
      title:
        prev.title.trim() ||
        (inv ? `Collect payment — ${inv.code} (${inv.customer.name})` : prev.title),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.assigneeId) {
      setError("Choose who this task is assigned to");
      return;
    }
    const hasLink = Boolean(form.salesOrderId || form.customerPoId || form.invoiceId || form.projectId);
    if (!form.title.trim() && !hasLink) {
      setError("Enter a title or link a sales order, customer PO, or invoice");
      return;
    }
    try {
      const task = await createTask.mutateAsync({
        title: form.title.trim() || undefined,
        ...(form.projectId ? { projectId: form.projectId } : {}),
        ...(form.salesOrderId ? { salesOrderId: form.salesOrderId } : {}),
        ...(form.customerPoId ? { customerPoId: form.customerPoId } : {}),
        ...(form.invoiceId ? { invoiceId: form.invoiceId } : {}),
        assigneeId: form.assigneeId,
        description: form.description || undefined,
        dueAt: form.dueAt || undefined,
        jobType: form.jobType,
        ...(form.recurring
          ? {
              recurrence: {
                cadence: form.cadence,
                dayOfWeek: form.dueAt ? new Date(`${form.dueAt}T12:00:00`).getDay() : undefined,
              },
            }
          : {}),
      });
      router.push(`/team-tasks/${task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-xl font-semibold text-primary">{getNewItemLabel("/team-tasks")}</h1>
      <p className="mb-6 text-sm text-slate-500">
        Link a sales order, customer PO, or invoice when you can — title, packing lines, and cheque amounts fill in automatically. Assignees follow Field Ops SOP, submit docs, then you verify.
      </p>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="jobType">Job type</Label>
            <Select
              id="jobType"
              value={form.jobType}
              onChange={(e) => setForm({ ...form, jobType: e.target.value as TaskJobType })}
            >
              {TASK_JOB_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TASK_JOB_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="mb-3 text-sm font-medium text-primary">Link to order (recommended)</p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="salesOrderId">Sales order</Label>
                <Select
                  id="salesOrderId"
                  value={form.salesOrderId}
                  onChange={(e) => (e.target.value ? applySalesOrder(e.target.value) : setForm({ ...form, salesOrderId: "" }))}
                >
                  <option value="">No sales order…</option>
                  {(linkOptions?.salesOrders ?? []).map((so) => (
                    <option key={so.id} value={so.id}>
                      {so.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="customerPoId">Customer PO</Label>
                <Select
                  id="customerPoId"
                  value={form.customerPoId}
                  onChange={(e) => (e.target.value ? applyCustomerPo(e.target.value) : setForm({ ...form, customerPoId: "" }))}
                >
                  <option value="">No customer PO…</option>
                  {(linkOptions?.customerPos ?? []).map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="invoiceId">Invoice (for cheque / payment collection)</Label>
                <Select
                  id="invoiceId"
                  value={form.invoiceId}
                  onChange={(e) => (e.target.value ? applyInvoice(e.target.value) : setForm({ ...form, invoiceId: "" }))}
                >
                  <option value="">No invoice…</option>
                  {(linkOptions?.invoices ?? []).map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.label}
                    </option>
                  ))}
                </Select>
                {selectedInv && (
                  <p className="mt-1 text-xs text-slate-500">
                    Outstanding {selectedInv.outstanding.toLocaleString()} {selectedInv.currency} — used when verifying payment.
                  </p>
                )}
              </div>
              {(selectedSo || selectedPo || selectedInv) && (
                <p className="text-xs text-slate-500">
                  Linked:{" "}
                  {[
                    selectedSo?.code,
                    selectedPo ? `PO ${selectedPo.poNumber}` : null,
                    selectedInv?.code,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="title">Task title {form.salesOrderId || form.customerPoId || form.invoiceId ? "(optional if linked)" : ""}</Label>
            <Input
              id="title"
              required={!(form.salesOrderId || form.customerPoId || form.invoiceId || form.projectId)}
              placeholder={
                form.jobType === "CHEQUE_COLLECTION"
                  ? "e.g. Collect cheque from Acme Trading"
                  : "e.g. Deliver readers to Dubai Mall site"
              }
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="projectId">Project (optional)</Label>
            <Select id="projectId" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              <option value="">No project linked…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="assigneeId">Assign to (driver / delivery / engineer)</Label>
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
            <Label htmlFor="dueAt">Due date</Label>
            <Input id="dueAt" type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
            <p className="mt-1 text-xs text-slate-400">Defaults to today so it appears on the driver&apos;s Field Ops board.</p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={form.recurring}
                onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
              />
              <span>
                <span className="font-medium text-primary">Recurring template</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Creates this job now and schedules the same route weekly / biweekly / monthly (worker spawns the next ones).
                </span>
              </span>
            </label>
            {form.recurring && (
              <div className="mt-3">
                <Label htmlFor="cadence">Cadence</Label>
                <Select
                  id="cadence"
                  value={form.cadence}
                  onChange={(e) => setForm({ ...form, cadence: e.target.value as "WEEKLY" | "BIWEEKLY" | "MONTHLY" })}
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="BIWEEKLY">Every 2 weeks</option>
                  <option value="MONTHLY">Monthly</option>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="description">Instructions (optional)</Label>
            <textarea
              id="description"
              rows={3}
              className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              placeholder="Address, contact person, cheque amount expected, access notes…"
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
              {createTask.isPending ? "Assigning…" : "Assign job"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
