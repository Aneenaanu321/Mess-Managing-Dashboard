"use client";

import { useParams } from "next/navigation";
import { usePortalQuotation, QUOTATION_STATUS_TONE } from "@/lib/portal";
import { Badge, Card } from "@/components/ui";

export default function PortalQuotationDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: quotation, isLoading } = usePortalQuotation(params.id);

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!quotation) return <p className="text-sm text-slate-500">Quotation not found.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">
            {quotation.code} · v{quotation.version}
          </p>
          <h1 className="text-xl font-semibold text-slate-900">{quotation.opportunity?.title ?? "Quotation"}</h1>
          <p className="text-sm text-slate-500">Prepared {new Date(quotation.createdAt).toLocaleDateString()}</p>
        </div>
        <Badge tone={QUOTATION_STATUS_TONE[quotation.status] ?? "slate"}>{quotation.status.replaceAll("_", " ")}</Badge>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Summary</h2>
        <dl className="space-y-2 text-sm">
          <Row label="Subtotal" value={`${Number(quotation.subtotal).toLocaleString()} ${quotation.currency}`} />
          <Row label="Discount" value={`${Number(quotation.discountTotal).toLocaleString()} ${quotation.currency}`} />
          <Row label="Tax" value={`${Number(quotation.taxTotal).toLocaleString()} ${quotation.currency}`} />
          <Row label="Grand Total" value={`${Number(quotation.grandTotal).toLocaleString()} ${quotation.currency}`} />
          <Row label="Payment Terms" value={quotation.paymentTerms ?? "—"} />
          <Row label="Valid Until" value={quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : "—"} />
        </dl>
      </Card>

      <Card className="overflow-hidden">
        <h2 className="p-5 pb-0 text-sm font-semibold text-slate-900">Line Items</h2>
        <div className="overflow-x-auto p-5 pt-3">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="py-2">Description</th>
                <th className="py-2">Qty</th>
                <th className="py-2">Unit Price</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotation.lineItems.map((li) => (
                <tr key={li.id}>
                  <td className="py-2.5 text-slate-800">{li.description}</td>
                  <td className="py-2.5 text-slate-600">{li.quantity}</td>
                  <td className="py-2.5 text-slate-600">{Number(li.unitPrice).toLocaleString()}</td>
                  <td className="py-2.5 font-medium text-slate-900">{Number(li.lineTotal).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
