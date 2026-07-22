"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateQuotation, QuotationLineItemInput } from "@/lib/quotations";
import { useOpportunities } from "@/lib/opportunities";
import { useCurrentUser } from "@/lib/auth";
import { Button, Input, Label, Select, Card } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";

const EMPTY_LINE: QuotationLineItemInput = { description: "", quantity: 1, unitPrice: 0, discountPct: 0, taxPct: 0 };

export default function NewQuotationPage() {
  const router = useRouter();
  const createQuotation = useCreateQuotation();
  const { data: user } = useCurrentUser();
  const { data: opportunitiesData, isLoading: opportunitiesLoading } = useOpportunities({ pageSize: 200 });
  const opportunities = opportunitiesData?.data ?? [];

  const [opportunityId, setOpportunityId] = useState("");
  const [currency, setCurrency] = useState(user?.company?.currency ?? "AED");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [lineItems, setLineItems] = useState<QuotationLineItemInput[]>([{ ...EMPTY_LINE }]);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  const selectedOpportunity = opportunities.find((o) => o.id === opportunityId);

  const totals = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    for (const line of lineItems) {
      const gross = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
      const discount = gross * ((Number(line.discountPct) || 0) / 100);
      const afterDiscount = gross - discount;
      const tax = afterDiscount * ((Number(line.taxPct) || 0) / 100);
      subtotal += gross;
      discountTotal += discount;
      taxTotal += tax;
    }
    return { subtotal, discountTotal, taxTotal, grandTotal: subtotal - discountTotal + taxTotal };
  }, [lineItems]);

  function updateLine(index: number, patch: Partial<QuotationLineItemInput>) {
    setLineItems((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLineItems((prev) => [...prev, { ...EMPTY_LINE }]);
  }

  async function removeLine(index: number) {
    if (lineItems.length <= 1) return;
    const ok = await confirm({
      title: "Remove line item?",
      message: "This line will be removed from the quotation.",
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!ok) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedOpportunity) {
      setError("Please select an opportunity");
      return;
    }
    if (lineItems.some((l) => !l.description.trim() || l.quantity <= 0)) {
      setError("Every line item needs a description and a quantity greater than 0");
      return;
    }
    try {
      const quotation = await createQuotation.mutateAsync({
        opportunityId: selectedOpportunity.id,
        customerId: selectedOpportunity.customerId,
        currency: currency || undefined,
        paymentTerms: paymentTerms || undefined,
        lineItems: lineItems.map((l) => ({
          description: l.description,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          discountPct: Number(l.discountPct) || 0,
          taxPct: Number(l.taxPct) || 0,
        })),
      });
      router.push(`/quotations/${quotation.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create quotation");
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-xl font-semibold text-primary">New Quotation</h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Label htmlFor="opportunityId">Opportunity</Label>
              <Select id="opportunityId" required value={opportunityId} onChange={(e) => setOpportunityId(e.target.value)}>
                <option value="">{opportunitiesLoading ? "Loading opportunities…" : "Select an opportunity"}</option>
                {opportunities.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.code} — {o.title} ({o.customer?.name ?? "—"})
                  </option>
                ))}
              </Select>
              {!opportunitiesLoading && opportunities.length === 0 && (
                <p className="mt-1 text-xs text-slate-400">No opportunities yet — create one first.</p>
              )}
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="paymentTerms">Payment terms</Label>
            <Input
              id="paymentTerms"
              placeholder="e.g. 40% advance / 40% on delivery / 20% on go-live"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Line items</Label>
              <Button type="button" variant="secondary" size="sm" onClick={addLine}>
                + Add line
              </Button>
            </div>

            <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-medium uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Unit price</th>
                    <th className="px-3 py-2">Disc %</th>
                    <th className="px-3 py-2">Tax %</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {lineItems.map((line, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2">
                        <Input
                          value={line.description}
                          onChange={(e) => updateLine(index, { description: e.target.value })}
                          placeholder="Item description"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          className="w-20"
                          value={line.quantity}
                          onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          className="w-28"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(index, { unitPrice: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="w-20"
                          value={line.discountPct}
                          onChange={(e) => updateLine(index, { discountPct: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="w-20"
                          value={line.taxPct}
                          onChange={(e) => updateLine(index, { taxPct: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(index)}>
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>{currency} {totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Discount</span>
              <span>-{currency} {totals.discountTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Tax</span>
              <span>{currency} {totals.taxTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1 font-semibold text-primary">
              <span>Grand total</span>
              <span>{currency} {totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {error && <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={createQuotation.isPending}>
              {createQuotation.isPending ? "Creating…" : "Create Quotation"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
