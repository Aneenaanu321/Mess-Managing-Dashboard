"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useSalesOrders, SalesOrder, SALES_ORDER_STATUS_TONE } from "@/lib/sales-orders";
import { Badge, Input, Select, Card } from "@/components/ui";

const STATUS_OPTIONS = ["", "PENDING_ALLOCATION", "PARTIALLY_ALLOCATED", "ALLOCATED", "FULFILLED", "CANCELLED"];

export default function SalesOrdersPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useSalesOrders({ status: status || undefined, search: search || undefined });

  const salesOrders = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">Fulfillment</p>
          <h1 className="font-display mt-1 text-2xl font-semibold tracking-tight text-primary">Sales Orders</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data?.meta?.total ?? 0} sales order{data?.meta?.total === 1 ? "" : "s"} created from verified customer POs
          </p>
        </div>
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search by code..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-52">
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s ? s.replaceAll("_", " ") : "All statuses"}
            </option>
          ))}
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-8 text-sm text-slate-500">Loading sales orders…</p>}
        {isError && (
          <p className="p-8 text-sm text-red-600 dark:text-red-400">
            Couldn&apos;t load sales orders. Is the API running at <code>NEXT_PUBLIC_API_URL</code>?
          </p>
        )}
        {!isLoading && !isError && salesOrders.length === 0 && (
          <div className="px-8 py-14 text-center">
            <p className="font-medium text-primary">No sales orders match these filters</p>
            <p className="mt-1 text-sm text-slate-500">
              Sales orders are created automatically when a Purchase Order is verified against its quotation.
            </p>
          </div>
        )}
        {salesOrders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50/80 dark:bg-slate-800/50 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Customer PO</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {salesOrders.map((so: SalesOrder) => (
                  <tr key={so.id} className="transition-colors hover:bg-brand-50/40">
                    <td className="px-4 py-3.5">
                      <Link href={`/sales-orders/${so.id}`} className="font-semibold text-brand-700 hover:text-brand-800 hover:underline">
                        {so.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-primary">{so.customer?.name}</td>
                    <td className="px-4 py-3.5 text-slate-600">{so.customerPO?.code}</td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {Number(so.totalAmount).toLocaleString()} {so.currency}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={SALES_ORDER_STATUS_TONE[so.status]}>{so.status.replaceAll("_", " ")}</Badge>
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
