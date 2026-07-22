"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Printer } from "lucide-react";
import { useDealSummary } from "@/lib/sales-ops";
import { Button, Card } from "@/components/ui";

export default function DealSummaryPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, isError } = useDealSummary(params.id);

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (isError || !data) return <p className="text-sm text-slate-500">Deal summary not found.</p>;

  return (
    <div className="mx-auto max-w-3xl print:max-w-none">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Sales Ops</p>
          <h1 className="text-xl font-semibold text-primary">Deal summary pack</h1>
          <p className="text-sm text-slate-500">
            {data.code} — printable lead → quote → PO overview
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/active-deals/${params.id}`}>
            <Button variant="secondary">Back</Button>
          </Link>
          <Button onClick={() => window.print()}>
            <Printer size={14} />
            Print
          </Button>
        </div>
      </div>

      <Card className="space-y-6 p-6 print:border-0 print:shadow-none">
        <section>
          <h1 className="text-xl font-semibold text-primary">{data.title}</h1>
          <p className="text-sm text-slate-500">
            {data.code} · {String(data.stage ?? "").replaceAll("_", " ")} · {data.customer?.name ?? "—"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Owner: {data.owner ? `${data.owner.firstName} ${data.owner.lastName}` : "Unassigned"}
            {data.owner?.email ? ` (${data.owner.email})` : ""}
          </p>
          <p className="text-sm text-slate-600">
            Value: {data.currency} {Number(data.estimatedValue).toLocaleString()}
          </p>
        </section>

        {data.leadSource && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-primary">Lead</h2>
            <p className="text-sm">
              {data.leadSource.code} — {data.leadSource.companyName} ({data.leadSource.contactName})
            </p>
            <p className="text-xs text-slate-500">
              {data.leadSource.email ?? "—"} · {data.leadSource.phone ?? "—"} · {data.leadSource.source}
            </p>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-sm font-semibold text-primary">Quotations</h2>
          {(data.quotations ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">None</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.quotations.map((q: { id: string; code: string; version: number; status: string; currency: string; grandTotal: string; revisionNote?: string | null }) => (
                <li key={q.id} className="border-b border-slate-100 pb-2 dark:border-slate-700">
                  <span className="font-medium">
                    {q.code} v{q.version}
                  </span>{" "}
                  — {q.status.replaceAll("_", " ")} — {q.currency} {Number(q.grandTotal).toLocaleString()}
                  {q.revisionNote && <p className="text-xs text-slate-500">Note: {q.revisionNote}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-primary">Customer POs</h2>
          {(data.customerPOs ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">None</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.customerPOs.map((po: { id: string; code: string; poNumber: string; status: string; currency: string; amount: string }) => (
                <li key={po.id}>
                  {po.code} / {po.poNumber} — {po.status} — {po.currency} {Number(po.amount).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-primary">Recent activity</h2>
          {(data.activities ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">None</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {data.activities.map((a: { id: string; occurredAt: string; type: string; subject: string }) => (
                <li key={a.id}>
                  <span className="text-slate-400">{new Date(a.occurredAt).toLocaleDateString()}</span> · {a.type}:{" "}
                  {a.subject}
                </li>
              ))}
            </ul>
          )}
        </section>
      </Card>
    </div>
  );
}
