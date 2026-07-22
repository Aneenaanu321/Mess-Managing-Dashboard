"use client";

import Link from "next/link";
import { usePortalInvoices, INVOICE_STATUS_TONE } from "@/lib/portal";
import { Badge, Card } from "@/components/ui";

export default function PortalInvoicesPage() {
  const { data: invoices, isLoading, isError } = usePortalInvoices();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-primary">Invoices</h1>
        <p className="mt-1 text-sm text-slate-500">Billing and payment status for your account.</p>
      </div>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-8 text-sm text-slate-500">Loading invoices…</p>}
        {isError && <p className="p-8 text-sm text-red-600 dark:text-red-400">Couldn&apos;t load invoices.</p>}
        {!isLoading && !isError && (invoices?.length ?? 0) === 0 && (
          <div className="px-8 py-14 text-center">
            <p className="font-medium text-primary">No invoices yet</p>
          </div>
        )}
        {(invoices?.length ?? 0) > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50/80 dark:bg-slate-800/50 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {invoices!.map((inv) => (
                  <tr key={inv.id} className="transition-colors hover:bg-brand-50/40">
                    <td className="px-4 py-3.5">
                      <Link href={`/portal/invoices/${inv.id}`} className="font-semibold text-brand-700 hover:text-brand-800 hover:underline">
                        {inv.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-primary">
                      {Number(inv.totalAmount).toLocaleString()} {inv.currency}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {Number(inv.amountPaid).toLocaleString()} {inv.currency}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3.5">
                      <Badge tone={INVOICE_STATUS_TONE[inv.status] ?? "slate"}>{inv.status.replaceAll("_", " ")}</Badge>
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
