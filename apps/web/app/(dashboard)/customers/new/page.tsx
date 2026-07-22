"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateCustomer, INDUSTRIES } from "@/lib/customers";
import { Button, Input, Label, Select, Card } from "@/components/ui";
import { getNewItemLabel } from "@/lib/nav-labels";

export default function NewCustomerPage() {
  const router = useRouter();
  const createCustomer = useCreateCustomer();
  const [form, setForm] = useState({
    name: "",
    industry: INDUSTRIES[0] ?? "RETAIL",
    website: "",
    taxId: "",
    contactFirstName: "",
    contactLastName: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const hasContact = form.contactFirstName.trim() || form.contactLastName.trim();
      const customer = await createCustomer.mutateAsync({
        name: form.name,
        industry: form.industry,
        website: form.website || undefined,
        taxId: form.taxId || undefined,
        primaryContact: hasContact
          ? {
              firstName: form.contactFirstName,
              lastName: form.contactLastName,
              email: form.contactEmail || undefined,
              phone: form.contactPhone || undefined,
            }
          : undefined,
      });
      router.push(`/customers/${customer.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create customer");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-primary">{getNewItemLabel("/customers")}</h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Customer name</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Select id="industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
            </div>
            <div>
              <Label htmlFor="taxId">Tax ID</Label>
              <Input id="taxId" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
            <h2 className="mb-3 text-sm font-semibold text-primary">Primary contact (optional)</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactFirstName">First name</Label>
                <Input
                  id="contactFirstName"
                  value={form.contactFirstName}
                  onChange={(e) => setForm({ ...form, contactFirstName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contactLastName">Last name</Label>
                <Input
                  id="contactLastName"
                  value={form.contactLastName}
                  onChange={(e) => setForm({ ...form, contactLastName: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactEmail">Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">Phone</Label>
                <Input id="contactPhone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
              </div>
            </div>
          </div>

          {error && <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCustomer.isPending}>
              {createCustomer.isPending ? "Creating…" : "Create Customer"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
