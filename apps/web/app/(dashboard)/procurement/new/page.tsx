"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateSupplierPO, useVendors } from "@/lib/procurement";
import { useProducts } from "@/lib/inventory";
import { Button, Input, Label, Select, Card } from "@/components/ui";

interface LineItemForm {
  productId: string;
  quantity: string;
  unitCost: string;
}

export default function NewSupplierPOPage() {
  const router = useRouter();
  const createPO = useCreateSupplierPO();
  const { data: vendorsData } = useVendors();
  const { data: productsData } = useProducts({ isActive: true });
  const vendors = vendorsData?.data ?? [];
  const products = productsData?.data ?? [];

  const [vendorId, setVendorId] = useState("");
  const [currency, setCurrency] = useState("AED");
  const [expectedDate, setExpectedDate] = useState("");
  const [lineItems, setLineItems] = useState<LineItemForm[]>([{ productId: "", quantity: "1", unitCost: "" }]);
  const [error, setError] = useState<string | null>(null);

  function updateLineItem(index: number, patch: Partial<LineItemForm>) {
    setLineItems((items) => items.map((li, i) => (i === index ? { ...li, ...patch } : li)));
  }

  function addLineItem() {
    setLineItems((items) => [...items, { productId: "", quantity: "1", unitCost: "" }]);
  }

  function removeLineItem(index: number) {
    setLineItems((items) => items.filter((_, i) => i !== index));
  }

  const total = lineItems.reduce((sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unitCost) || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const po = await createPO.mutateAsync({
        vendorId,
        currency: currency || undefined,
        expectedDate: expectedDate ? new Date(expectedDate).toISOString() : undefined,
        lineItems: lineItems.map((li) => ({
          productId: li.productId,
          quantity: Number(li.quantity),
          unitCost: Number(li.unitCost),
        })),
      });
      router.push(`/procurement/${po.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create supplier purchase order");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">New Supplier Purchase Order</h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Label htmlFor="vendorId">Vendor</Label>
              <Select id="vendorId" required value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                <option value="">Select vendor…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="expectedDate">Expected delivery date</Label>
            <Input id="expectedDate" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="mb-0">Line items</Label>
              <Button type="button" size="sm" variant="secondary" onClick={addLineItem}>
                + Add line
              </Button>
            </div>

            <div className="space-y-3">
              {lineItems.map((li, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 rounded-md border border-slate-200 p-3">
                  <div className="col-span-6">
                    <Select
                      required
                      value={li.productId}
                      onChange={(e) => updateLineItem(index, { productId: e.target.value })}
                    >
                      <option value="">Select product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      placeholder="Qty"
                      value={li.quantity}
                      onChange={(e) => updateLineItem(index, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      placeholder="Unit cost"
                      value={li.unitCost}
                      onChange={(e) => updateLineItem(index, { unitCost: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-2 text-right text-sm font-medium text-slate-900">
              Total: {total.toLocaleString()} {currency}
            </p>
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPO.isPending}>
              {createPO.isPending ? "Creating…" : "Create Supplier PO"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
