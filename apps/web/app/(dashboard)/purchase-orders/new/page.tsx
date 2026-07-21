"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateCustomerPO, useCustomersLite, useQuotationsLite } from "@/lib/purchase-orders";
import { Button, Input, Label, Select, Card } from "@/components/ui";

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const createPO = useCreateCustomerPO();
  const { data: customers } = useCustomersLite();
  const [form, setForm] = useState({
    poNumber: "",
    customerId: "",
    quotationId: "",
    amount: "",
    currency: "AED",
    opportunityId: "",
    advanceRequired: "",
  });
  const { data: quotations } = useQuotationsLite(form.customerId || undefined);
  const [error, setError] = useState<string | null>(null);

  const selectedQuotation = useMemo(
    () => quotations?.find((q) => q.id === form.quotationId),
    [quotations, form.quotationId],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const po = await createPO.mutateAsync({
        poNumber: form.poNumber,
        customerId: form.customerId,
        quotationId: form.quotationId,
        amount: Number(form.amount),
        currency: form.currency || undefined,
        opportunityId: form.opportunityId || undefined,
        advanceRequired: form.advanceRequired ? Number(form.advanceRequired) : undefined,
      });
      router.push(`/purchase-orders/${po.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create purchase order");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">New Purchase Order</h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="poNumber">Customer PO number</Label>
            <Input
              id="poNumber"
              required
              placeholder="e.g. PO-4471"
              value={form.poNumber}
              onChange={(e) => setForm({ ...form, poNumber: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerId">Customer</Label>
              <Select
                id="customerId"
                required
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value, quotationId: "" })}
              >
                <option value="">Select customer…</option>
                {(customers ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="quotationId">Quotation</Label>
              <Select
                id="quotationId"
                required
                disabled={!form.customerId}
                value={form.quotationId}
                onChange={(e) => setForm({ ...form, quotationId: e.target.value })}
              >
                <option value="">{form.customerId ? "Select quotation…" : "Select a customer first"}</option>
                {(quotations ?? []).map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.code} — {Number(q.grandTotal).toLocaleString()} {q.currency}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {selectedQuotation && (
            <p className="-mt-2 text-xs text-slate-400">
              Quotation grand total: {Number(selectedQuotation.grandTotal).toLocaleString()} {selectedQuotation.currency}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">PO amount</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="advanceRequired">Advance required</Label>
              <Input
                id="advanceRequired"
                type="number"
                min={0}
                step="0.01"
                value={form.advanceRequired}
                onChange={(e) => setForm({ ...form, advanceRequired: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="opportunityId">Opportunity ID (optional)</Label>
              <Input
                id="opportunityId"
                value={form.opportunityId}
                onChange={(e) => setForm({ ...form, opportunityId: e.target.value })}
              />
            </div>
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPO.isPending}>
              {createPO.isPending ? "Creating…" : "Create Purchase Order"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
