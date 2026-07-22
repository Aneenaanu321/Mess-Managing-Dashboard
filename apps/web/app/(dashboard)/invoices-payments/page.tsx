"use client";

import { useState } from "react";
import Link from "next/link";
import { useInvoices, INVOICE_STATUSES, INVOICE_STATUS_TONE, Invoice } from "@/lib/finance";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Input, Select, Card } from "@/components/ui";
import { getNewItemLabel, getPageLabel } from "@/lib/nav-labels";

export default function FinancePage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const { data: user } = useCurrentUser();
  const { data, isLoading, isError } = useInvoices({ status: status || undefined, search: search || undefined });

  const invoices = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary">{getPageLabel("/invoices-payments")}</h1>
          <p className="text-sm text-slate-500">
            {data?.meta?.total ?? 0} invoice{data?.meta?.total === 1 ? "" : "s"}
          </p>
        </div>
        {hasPermission(user, "finance:invoice_manage") && (
          <Link href="/invoices-payments/new">
            <Button>+ {getNewItemLabel("/invoices-payments")}</Button>
          </Link>
        )}
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <Input placeholder="Search invoice code..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
          <option value="">All statuses</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-6 text-sm text-slate-500">Loading invoices…</p>}
        {isError && <p className="p-6 text-sm text-red-600 dark:text-red-400">Couldn&apos;t load invoices.</p>}
        {!isLoading && !isError && invoices.length === 0 && <p className="p-6 text-sm text-slate-500">No invoices match these filters yet.</p>}
        {invoices.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Total</th>
                <th className="px-4 py-2.5">Paid</th>
                <th className="px-4 py-2.5">Due</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {invoices.map((inv: Invoice) => (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/invoices-payments/${inv.id}`} className="font-medium text-brand-600 hover:underline">
                      {inv.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{inv.customer?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-primary">
                    {inv.currency} {Number(inv.totalAmount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {inv.currency} {Number(inv.amountPaid).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Badge tone={INVOICE_STATUS_TONE[inv.status]}>{inv.status.replaceAll("_", " ")}</Badge>
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
