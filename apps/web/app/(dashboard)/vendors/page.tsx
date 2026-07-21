"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useVendors, useCreateVendor, Vendor } from "@/lib/procurement";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Button, Card, Input, Label } from "@/components/ui";

export default function VendorsPage() {
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const { data: user } = useCurrentUser();
  const { data, isLoading, isError } = useVendors(search || undefined);
  const vendors = data?.data ?? [];
  const canManage = hasPermission(user, "procurement:manage");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">Fulfillment</p>
          <h1 className="font-display mt-1 text-2xl font-semibold tracking-tight text-slate-900">Vendors</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data?.meta?.total ?? 0} vendor{data?.meta?.total === 1 ? "" : "s"} supplying your Procurement orders.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowNew((v) => !v)}>
            <Plus size={16} />
            {showNew ? "Cancel" : "New Vendor"}
          </Button>
        )}
      </div>

      {showNew && <NewVendorForm onDone={() => setShowNew(false)} />}

      <Card className="flex items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search vendor name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-8 text-sm text-slate-500">Loading vendors…</p>}
        {isError && <p className="p-8 text-sm text-red-600">Couldn&apos;t load vendors.</p>}
        {!isLoading && !isError && vendors.length === 0 && (
          <div className="px-8 py-14 text-center">
            <p className="font-medium text-slate-800">No vendors yet</p>
            <p className="mt-1 text-sm text-slate-500">Add one to start raising Procurement orders against it.</p>
          </div>
        )}
        {vendors.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Lead Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendors.map((v: Vendor) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3.5 font-medium text-slate-900">{v.name}</td>
                  <td className="px-4 py-3.5 text-slate-600">{v.contactName ?? "—"}</td>
                  <td className="px-4 py-3.5 text-slate-600">{v.email ?? "—"}</td>
                  <td className="px-4 py-3.5 text-slate-600">{v.phone ?? "—"}</td>
                  <td className="px-4 py-3.5 text-slate-600">{v.leadTimeDays !== null ? `${v.leadTimeDays} days` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function NewVendorForm({ onDone }: { onDone: () => void }) {
  const createVendor = useCreateVendor();
  const [form, setForm] = useState({ name: "", contactName: "", email: "", phone: "", leadTimeDays: "14" });
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
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create vendor");
    }
  }

  return (
    <Card className="p-5">
      <form className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={handleSubmit}>
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="contactName">Contact person</Label>
          <Input id="contactName" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="leadTimeDays">Lead time (days)</Label>
          <Input
            id="leadTimeDays"
            type="number"
            min={0}
            value={form.leadTimeDays}
            onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
          />
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Button type="submit" disabled={createVendor.isPending}>
            {createVendor.isPending ? "Creating…" : "Create Vendor"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
