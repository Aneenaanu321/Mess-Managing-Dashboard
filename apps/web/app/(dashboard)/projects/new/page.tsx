"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateProject } from "@/lib/projects";
import { useCustomers, useCustomer } from "@/lib/customers";
import { Button, Input, Label, Select, Card } from "@/components/ui";

export default function NewProjectPage() {
  const router = useRouter();
  const createProject = useCreateProject();
  const { data: customersData } = useCustomers({ pageSize: 100 });
  const customers = customersData?.data ?? [];

  const [form, setForm] = useState({
    name: "",
    customerId: "",
    siteId: "",
    opportunityId: "",
    salesOrderId: "",
    managerId: "",
    plannedGoLiveDate: "",
  });
  const [error, setError] = useState<string | null>(null);

  const { data: selectedCustomer } = useCustomer(form.customerId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const project = await createProject.mutateAsync({
        name: form.name,
        customerId: form.customerId,
        salesOrderId: form.salesOrderId,
        siteId: form.siteId || undefined,
        opportunityId: form.opportunityId || undefined,
        managerId: form.managerId || undefined,
        plannedGoLiveDate: form.plannedGoLiveDate || undefined,
      });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-primary">New Project</h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Project name</Label>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerId">Customer</Label>
              <Select
                id="customerId"
                required
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value, siteId: "", opportunityId: "" })}
              >
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="siteId">Site (optional)</Label>
              <Select id="siteId" value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })} disabled={!selectedCustomer?.sites?.length}>
                <option value="">No specific site</option>
                {selectedCustomer?.sites?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="opportunityId">Source opportunity (optional)</Label>
            <Select id="opportunityId" value={form.opportunityId} onChange={(e) => setForm({ ...form, opportunityId: e.target.value })} disabled={!selectedCustomer?.opportunities?.length}>
              <option value="">None</option>
              {selectedCustomer?.opportunities?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code} — {o.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="salesOrderId">Sales Order ID</Label>
              <Input
                id="salesOrderId"
                required
                placeholder="clxxxxxxxxxxxxxx"
                value={form.salesOrderId}
                onChange={(e) => setForm({ ...form, salesOrderId: e.target.value })}
              />
              <p className="mt-1 text-xs text-slate-400">Every project must be linked to the allocated Sales Order it fulfills.</p>
            </div>
            <div>
              <Label htmlFor="managerId">Project manager (user ID, optional)</Label>
              <Input id="managerId" value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })} />
            </div>
          </div>

          <div>
            <Label htmlFor="plannedGoLiveDate">Planned go-live date (optional)</Label>
            <Input
              id="plannedGoLiveDate"
              type="date"
              value={form.plannedGoLiveDate}
              onChange={(e) => setForm({ ...form, plannedGoLiveDate: e.target.value })}
            />
          </div>

          {error && <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? "Creating…" : "Create Project"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
