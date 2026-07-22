"use client";

import Link from "next/link";
import { useHandoffs } from "@/lib/sales-ops";
import { Badge, Card } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";

export default function HandoffsPage() {
  const { data, isLoading, isError } = useHandoffs();
  const items = data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Sales Ops"
        title="Handoffs"
        description="Won deals and checklist progress from PO → advance → sales order → project."
      />

      {isLoading && <p className="text-sm text-muted">Loading…</p>}
      {isError && <p className="text-sm text-red-600">Couldn&apos;t load handoffs.</p>}

      <div className="space-y-4">
        {items.map((item: any) => (
          <Card key={item.id} className="p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link href={`/active-deals/${item.id}`} className="text-lg font-semibold text-brand-700 hover:underline dark:text-brand-400">
                  {item.code} — {item.title}
                </Link>
                <p className="text-sm text-muted">{item.customer?.name}</p>
              </div>
              {item.checklist?.readyForHandoff ? <Badge tone="green">Ready</Badge> : <Badge tone="amber">Blocked</Badge>}
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              {[
                ["Quotation", item.checklist?.hasQuotation],
                ["PO received", item.checklist?.hasPo],
                ["PO document", item.checklist?.poDocumentUploaded],
                ["Amount match", item.checklist?.amountMatches],
                ["PO verified", item.checklist?.poVerified],
                ["Advance", item.checklist?.advanceReceived || Number(item.po?.advanceRequired ?? 0) === 0],
                ["Sales order", item.checklist?.hasSalesOrder],
                ["Project", item.checklist?.hasProject],
              ].map(([label, ok]) => (
                <div key={String(label)} className={`rounded-lg px-2 py-1.5 ${ok ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                  {ok ? "✓" : "○"} {label}
                </div>
              ))}
            </div>

            {item.blockers?.length > 0 && (
              <ul className="mb-3 list-inside list-disc text-sm text-amber-700 dark:text-amber-300">
                {item.blockers.map((b: string) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-2 text-sm">
              {item.po && (
                <Link href={`/customer-orders/${item.po.id}`} className="text-brand-700 hover:underline dark:text-brand-400">
                  Open PO {item.po.code}
                </Link>
              )}
              {!item.po && (
                <Link href="/customer-orders/new" className="text-brand-700 hover:underline dark:text-brand-400">
                  Log customer PO
                </Link>
              )}
            </div>
          </Card>
        ))}
        {!isLoading && items.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted">No won deals in the handoff queue.</Card>
        )}
      </div>
    </div>
  );
}
