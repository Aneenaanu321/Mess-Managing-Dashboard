"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSalesOrder, useAllocateSalesOrder, SALES_ORDER_STATUS_TONE } from "@/lib/sales-orders";
import { useWarehouses } from "@/lib/warehouse";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Card, Select } from "@/components/ui";

export default function SalesOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: so, isLoading } = useSalesOrder(params.id);
  const { data: warehouses } = useWarehouses();
  const { data: user } = useCurrentUser();
  const allocate = useAllocateSalesOrder(params.id);
  const [warehouseId, setWarehouseId] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!so) return <p className="text-sm text-slate-500">Sales order not found.</p>;

  const canManage = hasPermission(user, "sales_order:manage");
  const isTerminal = so.status === "FULFILLED" || so.status === "CANCELLED";

  async function handleAllocate() {
    setError(null);
    if (!warehouseId) {
      setError("Choose a warehouse first");
      return;
    }
    try {
      await allocate.mutateAsync(warehouseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Allocation failed");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{so.code}</p>
          <h1 className="text-xl font-semibold text-primary">{so.customer?.name}</h1>
          <p className="text-sm text-slate-500">
            From PO{" "}
            <Link href={`/customer-orders/${so.customerPO?.id}`} className="text-brand-700 hover:underline">
              {so.customerPO?.code}
            </Link>
          </p>
        </div>
        <Badge tone={SALES_ORDER_STATUS_TONE[so.status]}>{so.status.replaceAll("_", " ")}</Badge>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">Line Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="py-2">Product</th>
                <th className="py-2">Qty</th>
                <th className="py-2">Allocated</th>
                <th className="py-2">Unit Price</th>
                <th className="py-2">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {so.lineItems.map((line) => {
                const allocated = line.allocations
                  .filter((a) => a.status === "RESERVED")
                  .reduce((sum, a) => sum + Number(a.quantity), 0);
                return (
                  <tr key={line.id}>
                    <td className="py-2.5">
                      <p className="font-medium text-primary">{line.product.name}</p>
                      <p className="text-xs text-slate-500">{line.product.sku}</p>
                    </td>
                    <td className="py-2.5 text-slate-600">
                      {line.quantity} {line.product.unit}
                    </td>
                    <td className="py-2.5 text-slate-600">
                      {allocated} / {line.quantity}
                    </td>
                    <td className="py-2.5 text-slate-600">{Number(line.unitPrice).toLocaleString()}</td>
                    <td className="py-2.5 font-medium text-primary">
                      {Number(line.lineTotal).toLocaleString()} {so.currency}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-right text-sm font-semibold text-primary">
          Total: {Number(so.totalAmount).toLocaleString()} {so.currency}
        </p>
      </Card>

      {so.project && (
        <Card className="p-5">
          <h2 className="mb-2 text-sm font-semibold text-primary">Project</h2>
          <Link href={`/customer-projects/${so.project.id}`} className="text-sm text-brand-700 hover:underline">
            {so.project.code} — {so.project.status.replaceAll("_", " ")}
          </Link>
        </Card>
      )}

      {canManage && !isTerminal && (
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Allocate Inventory</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px]">
              <Select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                <option value="">Choose a warehouse…</option>
                {(warehouses ?? []).map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </Select>
            </div>
            <Button onClick={handleAllocate} disabled={allocate.isPending}>
              {allocate.isPending ? "Allocating…" : "Allocate Available Stock"}
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <p className="mt-2 text-xs text-slate-500">
            Reserves as much of each line as is currently in stock at the chosen warehouse. Re-run after restocking to cover the rest.
          </p>
        </Card>
      )}
    </div>
  );
}
