"use client";

import { useParams } from "next/navigation";
import { usePortalInvoice, INVOICE_STATUS_TONE } from "@/lib/portal";
import { Badge, Card } from "@/components/ui";

export default function PortalInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: invoice, isLoading } = usePortalInvoice(params.id);

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!invoice) return <p className="text-sm text-slate-500">Invoice not found.</p>;

  const balance = Number(invoice.totalAmount) - Number(invoice.amountPaid);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{invoice.code}</p>
          <h1 className="text-xl font-semibold text-slate-900">
            {Number(invoice.totalAmount).toLocaleString()} {invoice.currency}
          </h1>
          <p className="text-sm text-slate-500">Due {new Date(invoice.dueDate).toLocaleDateString()}</p>
        </div>
        <Badge tone={INVOICE_STATUS_TONE[invoice.status] ?? "slate"}>{invoice.status.replaceAll("_", " ")}</Badge>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Summary</h2>
        <dl className="space-y-2 text-sm">
          <Row label="Total" value={`${Number(invoice.totalAmount).toLocaleString()} ${invoice.currency}`} />
          <Row label="Paid" value={`${Number(invoice.amountPaid).toLocaleString()} ${invoice.currency}`} />
          <Row label="Balance" value={`${balance.toLocaleString()} ${invoice.currency}`} />
          <Row label="Issued" value={invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : "—"} />
        </dl>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Payments</h2>
        {invoice.payments.length === 0 ? (
          <p className="text-sm text-slate-500">No payments recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {invoice.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
                <span className="text-slate-600">
                  {new Date(p.receivedAt).toLocaleDateString()} · {p.method.replaceAll("_", " ")}
                </span>
                <span className="font-medium text-slate-900">
                  {Number(p.amount).toLocaleString()} {p.currency}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
