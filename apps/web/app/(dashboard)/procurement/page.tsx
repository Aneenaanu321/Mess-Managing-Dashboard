"use client";

import { useState } from "react";
import Link from "next/link";
import { useCreateVendor, useVendors } from "@/lib/procurement";
import { useSupplierPOs, SUPPLIER_PO_STATUS_TONE, SupplierPO } from "@/lib/procurement";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";

const STATUS_OPTIONS = ["", "DRAFT", "SENT", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"];

export default function ProcurementPage() {
  const [status, setStatus] = useState("");
  const { data: user } = useCurrentUser();
  const { data, isLoading, isError } = useSupplierPOs({ status: status || undefined });
  const supplierPOs = data?.data ?? [];

  const canManage = hasPermission(user, "procurement:manage");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary">Procurement</h1>
          <p className="text-sm text-slate-500">
            {data?.meta?.total ?? 0} supplier purchase order{data?.meta?.total === 1 ? "" : "s"}
          </p>
        </div>
        {canManage && (
          <Link href="/procurement/new">
            <Button>+ New Supplier PO</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s || "All statuses"}
                </option>
              ))}
            </Select>
          </Card>

          <Card className="overflow-hidden">
            {isLoading && <p className="p-6 text-sm text-slate-500">Loading supplier purchase orders…</p>}
            {isError && (
              <p className="p-6 text-sm text-red-600 dark:text-red-400">
                Couldn&apos;t load supplier purchase orders. Is the API running at <code>NEXT_PUBLIC_API_URL</code>?
              </p>
            )}
            {!isLoading && !isError && supplierPOs.length === 0 && (
              <p className="p-6 text-sm text-slate-500">No supplier purchase orders match these filters yet.</p>
            )}
            {supplierPOs.length > 0 && (
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-medium uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Code</th>
                    <th className="px-4 py-2.5">Vendor</th>
                    <th className="px-4 py-2.5">Total</th>
                    <th className="px-4 py-2.5">Expected</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {supplierPOs.map((po: SupplierPO) => (
                    <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <Link href={`/procurement/${po.id}`} className="font-medium text-brand-600 hover:underline">
                          {po.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-primary">{po.vendor?.name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {Number(po.totalAmount).toLocaleString()} {po.currency}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-3">
                        <Badge tone={SUPPLIER_PO_STATUS_TONE[po.status]}>{po.status.replaceAll("_", " ")}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <VendorsPanel canManage={canManage} />
      </div>
    </div>
  );
}

function VendorsPanel({ canManage }: { canManage: boolean }) {
  const { data, isLoading } = useVendors();
  const vendors = data?.data ?? [];
  const createVendor = useCreateVendor();
  const [form, setForm] = useState({ name: "", contactName: "", email: "", phone: "", leadTimeDays: "14" });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createVendor.mutateAsync({
        name: form.name,
        contactName: form.contactName || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        leadTimeDays: form.leadTimeDays ? Number(form.leadTimeDays) : undefined,
      });
      setForm({ name: "", contactName: "", email: "", phone: "", leadTimeDays: "14" });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create vendor");
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-primary">Vendors</h2>
        {canManage && (
          <Button size="sm" variant="secondary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "+ Add"}
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 space-y-2 rounded-md border border-slate-200 dark:border-slate-700 p-3">
          <div>
            <Label htmlFor="vendorName">Name</Label>
            <Input id="vendorName" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="vendorContact">Contact name</Label>
            <Input id="vendorContact" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="vendorEmail">Email</Label>
            <Input id="vendorEmail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="vendorLeadTime">Lead time (days)</Label>
            <Input
              id="vendorLeadTime"
              type="number"
              min={0}
              value={form.leadTimeDays}
              onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
            />
          </div>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" size="sm" disabled={createVendor.isPending} className="w-full">
            {createVendor.isPending ? "Adding…" : "Add Vendor"}
          </Button>
        </form>
      )}

      {isLoading && <p className="text-sm text-slate-500">Loading vendors…</p>}
      {!isLoading && vendors.length === 0 && <p className="text-sm text-slate-500">No vendors yet.</p>}
      <ul className="space-y-2">
        {vendors.map((v) => (
          <li key={v.id} className="rounded-md border border-slate-100 dark:border-slate-700 p-2.5 text-sm">
            <p className="font-medium text-primary">{v.name}</p>
            <p className="text-xs text-slate-500">
              {v.contactName ?? "—"} {v.email ? `· ${v.email}` : ""} · {v.leadTimeDays ?? 14}d lead time
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
