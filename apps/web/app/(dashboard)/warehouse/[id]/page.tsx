"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAdjustStock, useStock, useWarehouses } from "@/lib/warehouse";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";

export default function WarehouseDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: user } = useCurrentUser();
  const { data: warehouses } = useWarehouses();
  const { data: stockData, isLoading, isError } = useStock({ warehouseId: params.id });
  const adjustStock = useAdjustStock();

  const warehouse = warehouses?.find((w) => w.id === params.id);
  const stockItems = stockData?.data ?? [];

  const [form, setForm] = useState({ productId: "", quantityDelta: "", reason: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canAdjust = hasPermission(user, "inventory:adjust");

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await adjustStock.mutateAsync({
        warehouseId: params.id,
        productId: form.productId,
        quantityDelta: Number(form.quantityDelta),
        reason: form.reason,
      });
      setSuccess("Stock adjusted successfully.");
      setForm({ productId: "", quantityDelta: "", reason: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to adjust stock");
    }
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-medium text-slate-400">{warehouse?.code}</p>
        <h1 className="text-xl font-semibold text-slate-900">{warehouse?.name ?? "Warehouse"}</h1>
        <p className="text-sm text-slate-500">{warehouse?.address ?? "—"}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            {isLoading && <p className="p-6 text-sm text-slate-500">Loading stock…</p>}
            {isError && <p className="p-6 text-sm text-red-600">Couldn&apos;t load stock levels.</p>}
            {!isLoading && !isError && stockItems.length === 0 && (
              <p className="p-6 text-sm text-slate-500">No stock recorded for this warehouse yet.</p>
            )}
            {stockItems.length > 0 && (
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">SKU</th>
                    <th className="px-4 py-2.5">Product</th>
                    <th className="px-4 py-2.5">On Hand</th>
                    <th className="px-4 py-2.5">Reserved</th>
                    <th className="px-4 py-2.5">Reorder Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockItems.map((si) => {
                    const low = Number(si.onHandQty) <= Number(si.product.reorderLevel);
                    return (
                      <tr key={si.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{si.product.sku}</td>
                        <td className="px-4 py-3 text-slate-600">{si.product.name}</td>
                        <td className="px-4 py-3">
                          <span className={low ? "font-semibold text-red-600" : "text-slate-900"}>{Number(si.onHandQty)}</span>
                          {low && <Badge tone="red" className="ml-2">Low</Badge>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{Number(si.reservedQty)}</td>
                        <td className="px-4 py-3 text-slate-600">{Number(si.product.reorderLevel)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Adjust Stock</h2>
          {canAdjust ? (
            <form onSubmit={handleAdjust} className="space-y-3">
              <div>
                <Label htmlFor="productId">Product</Label>
                <Select id="productId" required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                  <option value="">Select product…</option>
                  {stockItems.map((si) => (
                    <option key={si.productId} value={si.productId}>
                      {si.product.sku} — {si.product.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="quantityDelta">Quantity change</Label>
                <Input
                  id="quantityDelta"
                  type="number"
                  required
                  placeholder="e.g. 10 or -5"
                  value={form.quantityDelta}
                  onChange={(e) => setForm({ ...form, quantityDelta: e.target.value })}
                />
                <p className="mt-1 text-xs text-slate-400">Use a negative number to remove stock.</p>
              </div>
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Input
                  id="reason"
                  required
                  placeholder="e.g. Cycle count correction"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-emerald-600">{success}</p>}
              <Button type="submit" disabled={adjustStock.isPending} className="w-full">
                {adjustStock.isPending ? "Adjusting…" : "Apply Adjustment"}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-slate-500">You don&apos;t have permission to adjust stock.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
