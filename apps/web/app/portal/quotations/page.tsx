"use client";

import Link from "next/link";
import { usePortalQuotations, QUOTATION_STATUS_TONE } from "@/lib/portal";
import { Badge, Card } from "@/components/ui";

export default function PortalQuotationsPage() {
  const { data: quotations, isLoading, isError } = usePortalQuotations();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-primary">Quotations</h1>
        <p className="mt-1 text-sm text-slate-500">Quotes we&apos;ve prepared for your account.</p>
      </div>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-8 text-sm text-slate-500">Loading quotations…</p>}
        {isError && <p className="p-8 text-sm text-red-600 dark:text-red-400">Couldn&apos;t load quotations.</p>}
        {!isLoading && !isError && (quotations?.length ?? 0) === 0 && (
          <div className="px-8 py-14 text-center">
            <p className="font-medium text-primary">No quotations yet</p>
            <p className="mt-1 text-sm text-slate-500">Quotations we prepare for you will show up here.</p>
          </div>
        )}
        {(quotations?.length ?? 0) > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50/80 dark:bg-slate-800/50 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Opportunity</th>
                  <th className="px-4 py-3">Grand Total</th>
                  <th className="px-4 py-3">Valid Until</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {quotations!.map((q) => (
                  <tr key={q.id} className="transition-colors hover:bg-brand-50/40">
                    <td className="px-4 py-3.5">
                      <Link href={`/portal/quotations/${q.id}`} className="font-semibold text-brand-700 hover:text-brand-800 hover:underline">
                        {q.code}
                      </Link>
                      <span className="ml-1 text-xs text-slate-400">v{q.version}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{q.opportunity?.title ?? "—"}</td>
                    <td className="px-4 py-3.5 font-medium text-primary">
                      {Number(q.grandTotal).toLocaleString()} {q.currency}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{q.validUntil ? new Date(q.validUntil).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3.5">
                      <Badge tone={QUOTATION_STATUS_TONE[q.status] ?? "slate"}>{q.status.replaceAll("_", " ")}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
