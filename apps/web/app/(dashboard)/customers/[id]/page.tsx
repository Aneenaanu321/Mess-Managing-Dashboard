"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCustomer } from "@/lib/customers";
import { Badge, Card } from "@/components/ui";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { getPageLabel } from "@/lib/nav-labels";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: customer, isLoading } = useCustomer(params.id);

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!customer) return <p className="text-sm text-slate-500">Customer not found.</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{customer.code}</p>
          <h1 className="text-xl font-semibold text-primary">{customer.name}</h1>
          <p className="text-sm text-slate-500">{customer.industry}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Details</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Website" value={customer.website ?? "—"} />
            <Row label="Tax ID" value={customer.taxId ?? "—"} />
            <Row label="Owner" value={customer.owner ? `${customer.owner.firstName} ${customer.owner.lastName}` : "Unassigned"} />
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">{getPageLabel("/active-deals")}</h2>
          {!customer.opportunities || customer.opportunities.length === 0 ? (
            <p className="text-sm text-slate-500">No {getPageLabel("/active-deals").toLowerCase()} yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {customer.opportunities.map((opp) => (
                <li key={opp.id} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0 last:pb-0">
                  <Link href={`/active-deals/${opp.id}`} className="font-medium text-brand-600 hover:underline">
                    {opp.code}
                  </Link>
                  <span className="text-slate-500">{opp.title}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Contacts</h2>
          {!customer.contacts || customer.contacts.length === 0 ? (
            <p className="text-sm text-slate-500">No contacts yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {customer.contacts.map((contact) => (
                <li key={contact.id} className="border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-primary">
                      {contact.firstName} {contact.lastName}
                    </span>
                    {contact.isPrimary && <Badge tone="blue">Primary</Badge>}
                  </div>
                  <p className="text-slate-500">{contact.email ?? "—"} · {contact.phone ?? "—"}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Sites</h2>
          {!customer.sites || customer.sites.length === 0 ? (
            <p className="text-sm text-slate-500">No sites yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {customer.sites.map((site) => (
                <li key={site.id} className="border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0 last:pb-0">
                  <p className="font-medium text-primary">{site.label}</p>
                  <p className="text-slate-500">
                    {[site.addressLine, site.city, site.country].filter(Boolean).join(", ") || "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <ActivityTimeline scope={{ customerId: customer.id }} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-primary">{value}</dd>
    </div>
  );
}
