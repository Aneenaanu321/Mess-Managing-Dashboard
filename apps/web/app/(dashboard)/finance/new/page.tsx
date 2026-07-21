"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateInvoice, CreateInvoiceLineItemInput } from "@/lib/finance";
import { useCustomers } from "@/lib/customers";
import { useProjects } from "@/lib/projects";
import { Button, Input, Label, Select, Card } from "@/components/ui";

const emptyLine: CreateInvoiceLineItemInput = { description: "", quantity: 1, unitPrice: 0, taxPct: 0 };

export default function NewInvoicePage() {
  const router = useRouter();
  const createInvoice = useCreateInvoice();
  const { data: customersData } = useCustomers({ pageSize: 100 });
  const { data: projectsData } = useProjects({ page: 1 });
  const customers = customersData?.data ?? [];
  const projects = projectsData?.data ?? [];

  const [customerId, setCustomerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [milestoneLabel, setMilestoneLabel] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [lineItems, setLineItems] = useState<CreateInvoiceLineItemInput[]>([{ ...emptyLine }]);
  const [error, setError] = useState<string | null>(null);

  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const taxTotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice * ((li.taxPct ?? 0) / 100), 0);

  function updateLine(index: number, patch: Partial<CreateInvoiceLineItemInput>) {
    setLineItems((prev) => prev.map((li, i) => (i === index ? { ...li, ...patch } : li)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const invoice = await createInvoice.mutateAsync({
        customerId,
        projectId: projectId || undefined,
        milestoneLabel: milestoneLabel || undefined,
        dueDate,
        lineItems,
      });
      router.push(`/finance/${invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">New Invoice</h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerId">Customer</Label>
              <Select id="customerId" required value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="projectId">Project (optional)</Label>
              <Select id="projectId" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="milestoneLabel">Milestone label (optional)</Label>
              <Input id="milestoneLabel" placeholder="Advance / Delivery / Go-Live" value={milestoneLabel} onChange={(e) => setMilestoneLabel(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Line items</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setLineItems((prev) => [...prev, { ...emptyLine }])}>
                + Add line
              </Button>
            </div>
            <div className="space-y-2">
              {lineItems.map((li, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <Input
                    className="col-span-5"
                    placeholder="Description"
                    required
                    value={li.description}
                    onChange={(e) => updateLine(i, { description: e.target.value })}
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Qty"
                    value={li.quantity}
                    onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Unit price"
                    value={li.unitPrice}
                    onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })}
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    placeholder="Tax %"
                    value={li.taxPct}
                    onChange={(e) => updateLine(i, { taxPct: Number(e.target.value) })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="col-span-1"
                    disabled={lineItems.length === 1}
                    onClick={() => setLineItems((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-6 border-t border-slate-100 pt-4 text-sm">
            <span className="text-slate-500">
              Subtotal: <span className="font-medium text-slate-900">{subtotal.toFixed(2)}</span>
            </span>
            <span className="text-slate-500">
              Tax: <span className="font-medium text-slate-900">{taxTotal.toFixed(2)}</span>
            </span>
            <span className="text-slate-500">
              Total: <span className="font-semibold text-slate-900">{(subtotal + taxTotal).toFixed(2)}</span>
            </span>
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={createInvoice.isPending}>
              {createInvoice.isPending ? "Creating…" : "Create Invoice"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
