"use client";

import Link from "next/link";
import { usePortalPurchaseOrders, PO_STATUS_TONE } from "@/lib/portal";
import { Badge, Card } from "@/components/ui";

export default function PortalPurchaseOrdersPage() {
  const { data: pos, isLoading, isError } = usePortalPurchaseOrders();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">Purchase Orders</h1>
        <p className="mt-1 text-sm text-slate-500">POs you&apos;ve issued to us.</p>
      </div>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-8 text-sm text-slate-500">Loading purchase orders…</p>}
        {isError && <p className="p-8 text-sm text-red-600">Couldn&apos;t load purchase orders.</p>}
        {!isLoading && !isError && (pos?.length ?? 0) === 0 && (
          <div className="px-8 py-14 text-center">
            <p className="font-medium text-slate-800">No purchase orders yet</p>
          </div>
        )}
        {(pos?.length ?? 0) > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">PO Number</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Received</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pos!.map((po) => (
                  <tr key={po.id} className="transition-colors hover:bg-brand-50/40">
                    <td className="px-4 py-3.5">
                      <Link href={`/portal/purchase-orders/${po.id}`} className="font-semibold text-brand-700 hover:text-brand-800 hover:underline">
                        {po.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{po.poNumber}</td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">
                      {Number(po.amount).toLocaleString()} {po.currency}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{new Date(po.receivedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3.5">
                      <Badge tone={PO_STATUS_TONE[po.status] ?? "slate"}>{po.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
