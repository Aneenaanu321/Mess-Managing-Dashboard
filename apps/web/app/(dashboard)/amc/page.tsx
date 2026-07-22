"use client";

import { useState } from "react";
import Link from "next/link";
import { useAmcContracts, AMC_STATUSES, AMC_STATUS_TONE, AmcContract } from "@/lib/amc";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Input, Select, Card } from "@/components/ui";

export default function AmcPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [expiringOnly, setExpiringOnly] = useState(false);
  const { data: user } = useCurrentUser();
  const { data, isLoading, isError } = useAmcContracts({ status: status || undefined, search: search || undefined, expiringOnly });

  const contracts = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary">AMC & Contracts</h1>
          <p className="text-sm text-slate-500">
            {data?.meta?.total ?? 0} contract{data?.meta?.total === 1 ? "" : "s"}
          </p>
        </div>
        {hasPermission(user, "amc:manage") && (
          <Link href="/amc/new">
            <Button>+ New Contract</Button>
          </Link>
        )}
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <Input placeholder="Search contract code..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
          <option value="">All statuses</option>
          {AMC_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={expiringOnly} onChange={(e) => setExpiringOnly(e.target.checked)} />
          Expiring within 90 days
        </label>
      </Card>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-6 text-sm text-slate-500">Loading contracts…</p>}
        {isError && <p className="p-6 text-sm text-red-600 dark:text-red-400">Couldn&apos;t load contracts.</p>}
        {!isLoading && !isError && contracts.length === 0 && <p className="p-6 text-sm text-slate-500">No contracts match these filters yet.</p>}
        {contracts.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Value</th>
                <th className="px-4 py-2.5">End Date</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {contracts.map((c: AmcContract) => (
                <tr key={c.id} className={c.expiringSoon ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50"}>
                  <td className="px-4 py-3">
                    <Link href={`/amc/${c.id}`} className="font-medium text-brand-600 hover:underline">
                      {c.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.customer?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-primary">
                    {c.currency} {Number(c.contractValue).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(c.endDate).toLocaleDateString()}
                    {c.expiringSoon && (
                      <span className="ml-2 text-xs font-medium text-amber-700">({c.daysToExpiry}d left)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={AMC_STATUS_TONE[c.status]}>{c.status.replaceAll("_", " ")}</Badge>
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
