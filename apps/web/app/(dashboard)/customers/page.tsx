"use client";

import { useState } from "react";
import Link from "next/link";
import { useCustomers, useMergeCustomers, INDUSTRIES, Customer } from "@/lib/customers";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Button, Input, Select, Card } from "@/components/ui";

export default function CustomersPage() {
  const [industry, setIndustry] = useState("");
  const [search, setSearch] = useState("");
  const [showMerge, setShowMerge] = useState(false);
  const { data: user } = useCurrentUser();
  const { data, isLoading, isError } = useCustomers({ industry: industry || undefined, search: search || undefined });

  const customers = data?.data ?? [];
  const canMerge = hasPermission(user, "customer:merge");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">
            {data?.meta?.total ?? 0} total customer{data?.meta?.total === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          {canMerge && (
            <Button variant="secondary" onClick={() => setShowMerge((v) => !v)}>
              {showMerge ? "Cancel Merge" : "Merge Duplicates"}
            </Button>
          )}
          {hasPermission(user, "customer:create") && (
            <Link href="/customers/new">
              <Button>+ New Customer</Button>
            </Link>
          )}
        </div>
      </div>

      {showMerge && <MergePanel customers={customers} onDone={() => setShowMerge(false)} />}

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <Input
          placeholder="Search name, code, website, tax ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={industry} onChange={(e) => setIndustry(e.target.value)} className="max-w-xs">
          <option value="">All industries</option>
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-6 text-sm text-slate-500">Loading customers…</p>}
        {isError && (
          <p className="p-6 text-sm text-red-600">
            Couldn&apos;t load customers. Is the API running at <code>NEXT_PUBLIC_API_URL</code>?
          </p>
        )}
        {!isLoading && !isError && customers.length === 0 && (
          <p className="p-6 text-sm text-slate-500">No customers match these filters yet.</p>
        )}
        {customers.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Industry</th>
                <th className="px-4 py-2.5">Website</th>
                <th className="px-4 py-2.5">Owner</th>
                <th className="px-4 py-2.5">Contacts</th>
                <th className="px-4 py-2.5">Sites</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((customer: Customer & { _count?: { contacts: number; sites: number; opportunities: number } }) => (
                <tr key={customer.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/customers/${customer.id}`} className="font-medium text-brand-600 hover:underline">
                      {customer.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-900">{customer.name}</td>
                  <td className="px-4 py-3 text-slate-600">{customer.industry}</td>
                  <td className="px-4 py-3 text-slate-600">{customer.website || <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {customer.owner ? `${customer.owner.firstName} ${customer.owner.lastName}` : <span className="text-slate-400">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{customer._count?.contacts ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{customer._count?.sites ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function MergePanel({ customers, onDone }: { customers: Customer[]; onDone: () => void }) {
  const mergeCustomers = useMergeCustomers();
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleMerge() {
    setError(null);
    if (!sourceId || !targetId) {
      setError("Choose both a duplicate and a customer to keep");
      return;
    }
    if (sourceId === targetId) {
      setError("Choose two different customers");
      return;
    }
    const source = customers.find((c) => c.id === sourceId);
    const target = customers.find((c) => c.id === targetId);
    if (!window.confirm(`Merge "${source?.name}" into "${target?.name}"? This deletes the duplicate record — its contacts, sites, opportunities, and other records move to the surviving customer. This can't be undone.`)) {
      return;
    }
    try {
      await mergeCustomers.mutateAsync({ sourceId, targetId });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed");
    }
  }

  return (
    <Card className="mb-4 space-y-3 p-4">
      <p className="text-sm text-slate-600">
        Pick the duplicate to remove and the customer to keep everything on. All contacts, sites, opportunities, quotations,
        orders, projects, invoices, tickets, and AMC contracts move to the surviving record.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Duplicate (will be deleted)</label>
          <Select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            <option value="">Select customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Keep (survives the merge)</label>
          <Select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            <option value="">Select customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={handleMerge} disabled={mergeCustomers.isPending}>
          {mergeCustomers.isPending ? "Merging…" : "Merge"}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </Card>
  );
}
