"use client";

import Link from "next/link";
import { useHygiene } from "@/lib/sales-ops";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";

export default function HygienePage() {
  const { data, isLoading, isError } = useHygiene();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Sales Ops"
        title="Data Hygiene"
        description="Duplicate leads and customers missing owners or primary contacts."
      />

      {isLoading && <p className="text-sm text-muted">Loading…</p>}
      {isError && <p className="text-sm text-red-600">Couldn&apos;t load hygiene data.</p>}

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">Duplicate lead groups</h2>
        <div className="space-y-3">
          {(data?.duplicateLeadGroups ?? []).map((g: any) => (
            <div key={g.key} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <p className="mb-2 text-xs font-medium text-muted">Match: {g.key}</p>
              <ul className="space-y-1 text-sm">
                {g.leads.map((l: any) => (
                  <li key={l.id}>
                    <Link href={`/new-inquiries/${l.id}`} className="text-brand-700 hover:underline dark:text-brand-400">
                      {l.code} — {l.companyName} ({l.contactName})
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {(data?.duplicateLeadGroups ?? []).length === 0 && <p className="text-sm text-muted">No duplicate groups found.</p>}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Customers without owner</h2>
          <ul className="space-y-1 text-sm">
            {(data?.customersWithoutOwner ?? []).slice(0, 20).map((c: any) => (
              <li key={c.id}>
                <Link href={`/customers/${c.id}`} className="text-brand-700 hover:underline dark:text-brand-400">
                  {c.code} — {c.name}
                </Link>
              </li>
            ))}
            {(data?.customersWithoutOwner ?? []).length === 0 && <li className="text-muted">None</li>}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Missing primary contact</h2>
          <ul className="space-y-1 text-sm">
            {(data?.customersMissingPrimaryContact ?? []).slice(0, 20).map((c: any) => (
              <li key={c.id}>
                <Link href={`/customers/${c.id}`} className="text-brand-700 hover:underline dark:text-brand-400">
                  {c.code} — {c.name}
                </Link>
              </li>
            ))}
            {(data?.customersMissingPrimaryContact ?? []).length === 0 && <li className="text-muted">None</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
