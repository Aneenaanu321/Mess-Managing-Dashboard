"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateOpportunity } from "@/lib/opportunities";
import { useCustomers } from "@/lib/customers";
import { useCurrentUser } from "@/lib/auth";
import { Button, Input, Label, Select, Card } from "@/components/ui";
import { getNewItemLabel } from "@/lib/nav-labels";

export default function NewOpportunityPage() {
  const router = useRouter();
  const createOpportunity = useCreateOpportunity();
  const { data: user } = useCurrentUser();
  const { data: customersData, isLoading: customersLoading } = useCustomers({ pageSize: 100 });
  const customers = customersData?.data ?? [];

  const [form, setForm] = useState({
    title: "",
    customerId: "",
    estimatedValue: "",
    currency: user?.company?.currency ?? "AED",
    expectedCloseDate: "",
  });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const estimatedValue = Number(form.estimatedValue);
    if (!Number.isFinite(estimatedValue) || estimatedValue < 0) {
      setError("Estimated value must be a non-negative number");
      return;
    }
    if (!form.customerId) {
      setError("Please select a customer");
      return;
    }
    try {
      const opportunity = await createOpportunity.mutateAsync({
        title: form.title,
        customerId: form.customerId,
        estimatedValue,
        currency: form.currency || undefined,
        expectedCloseDate: form.expectedCloseDate || undefined,
      });
      router.push(`/active-deals/${opportunity.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create deal");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-primary">{getNewItemLabel("/active-deals")}</h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          <div>
            <Label htmlFor="customerId">Customer</Label>
            <Select
              id="customerId"
              required
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            >
              <option value="">{customersLoading ? "Loading customers…" : "Select a customer"}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </Select>
            {!customersLoading && customers.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">
                No customers yet — create one from the Customers page first.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="estimatedValue">Estimated value</Label>
              <Input
                id="estimatedValue"
                type="number"
                min={0}
                required
                value={form.estimatedValue}
                onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </div>
          </div>

          <div>
            <Label htmlFor="expectedCloseDate">Expected close date</Label>
            <Input
              id="expectedCloseDate"
              type="date"
              value={form.expectedCloseDate}
              onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })}
            />
          </div>

          {error && <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={createOpportunity.isPending}>
              {createOpportunity.isPending ? "Creating…" : "Create Deal"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
