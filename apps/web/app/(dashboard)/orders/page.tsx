"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuotations, QUOTATION_STATUSES, STATUS_TONE, Quotation } from "@/lib/quotations";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Input, Select, Card } from "@/components/ui";
import { getNewItemLabel, getPageLabel } from "@/lib/nav-labels";

export default function QuotationsPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const { data: user } = useCurrentUser();
  const { data, isLoading, isError } = useQuotations({ status: status || undefined, search: search || undefined });

  const quotations = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary">{getPageLabel("/orders")}</h1>
          <p className="text-sm text-slate-500">
            {data?.meta?.total ?? 0} total quotation{data?.meta?.total === 1 ? "" : "s"}
          </p>
        </div>
        {hasPermission(user, "quotation:create") && (
          <Link href="/orders/new">
            <Button>+ {getNewItemLabel("/orders")}</Button>
          </Link>
        )}
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <Input
          placeholder="Search code, customer, deal..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
          <option value="">All statuses</option>
          {QUOTATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-6 text-sm text-slate-500">Loading quotations…</p>}
        {isError && (
          <p className="p-6 text-sm text-red-600 dark:text-red-400">
            Couldn&apos;t load quotations. Is the API running at <code>NEXT_PUBLIC_API_URL</code>?
          </p>
        )}
        {!isLoading && !isError && quotations.length === 0 && (
          <p className="p-6 text-sm text-slate-500">No quotations match these filters yet.</p>
        )}
        {quotations.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Deal</th>
                <th className="px-4 py-2.5">Grand Total</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {quotations.map((q: Quotation) => (
                <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/orders/${q.id}`} className="font-medium text-brand-600 hover:underline">
                      {q.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-primary">{q.customer?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{q.opportunity?.title ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {q.currency} {Number(q.grandTotal).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[q.status]}>{q.status.replaceAll("_", " ")}</Badge>
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
