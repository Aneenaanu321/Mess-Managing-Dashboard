"use client";

import { useState } from "react";
import Link from "next/link";
import { useCustomerPOs, CUSTOMER_PO_STATUS_TONE, CustomerPO } from "@/lib/purchase-orders";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Input, Select, Card } from "@/components/ui";
import { getNewItemLabel, getPageLabel } from "@/lib/nav-labels";

const STATUS_OPTIONS = ["", "RECEIVED", "VERIFIED", "DISPUTED", "CANCELLED"];

export default function PurchaseOrdersPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const { data: user } = useCurrentUser();
  const { data, isLoading, isError } = useCustomerPOs({ status: status || undefined, search: search || undefined });

  const pos = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary">{getPageLabel("/customer-orders")}</h1>
          <p className="text-sm text-slate-500">
            {data?.meta?.total ?? 0} total customer order{data?.meta?.total === 1 ? "" : "s"}
          </p>
        </div>
        {hasPermission(user, "customer_po:create") && (
          <Link href="/customer-orders/new">
            <Button>+ {getNewItemLabel("/customer-orders")}</Button>
          </Link>
        )}
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <Input
          placeholder="Search PO number, code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s || "All statuses"}
            </option>
          ))}
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-6 text-sm text-slate-500">Loading purchase orders…</p>}
        {isError && (
          <p className="p-6 text-sm text-red-600 dark:text-red-400">
            Couldn&apos;t load purchase orders. Is the API running at <code>NEXT_PUBLIC_API_URL</code>?
          </p>
        )}
        {!isLoading && !isError && pos.length === 0 && (
          <p className="p-6 text-sm text-slate-500">No purchase orders match these filters yet.</p>
        )}
        {pos.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">PO Number</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Quotation</th>
                <th className="px-4 py-2.5">Amount</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {pos.map((po: CustomerPO) => (
                <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/customer-orders/${po.id}`} className="font-medium text-brand-600 hover:underline">
                      {po.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{po.poNumber}</td>
                  <td className="px-4 py-3 text-primary">{po.customer?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{po.quotation?.code ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {Number(po.amount).toLocaleString()} {po.currency}
                    {po.amountMismatch && <span className="ml-2 text-xs font-medium text-red-600 dark:text-red-400">mismatch</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={CUSTOMER_PO_STATUS_TONE[po.status]}>{po.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
