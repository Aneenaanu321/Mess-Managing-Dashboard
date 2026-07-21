"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuotation, useSendQuotation, useApproveQuotation, STATUS_TONE } from "@/lib/quotations";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Card } from "@/components/ui";

export default function QuotationDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: quotation, isLoading } = useQuotation(params.id);
  const { data: user } = useCurrentUser();
  const sendQuotation = useSendQuotation();
  const approveQuotation = useApproveQuotation();
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!quotation) return <p className="text-sm text-slate-500">Quotation not found.</p>;

  const canSend = hasPermission(user, "quotation:send") && (quotation.status === "DRAFT" || quotation.status === "APPROVED_INTERNAL");
  const canApprove = hasPermission(user, "quotation:approve") && (quotation.status === "DRAFT" || quotation.status === "PENDING_APPROVAL");

  async function handleSend() {
    setError(null);
    try {
      await sendQuotation.mutateAsync(quotation!.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send quotation");
    }
  }

  async function handleApprove() {
    setError(null);
    try {
      await approveQuotation.mutateAsync(quotation!.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve quotation");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{quotation.code}</p>
          <h1 className="text-xl font-semibold text-slate-900">
            {quotation.customer?.name ?? "—"} <span className="text-slate-400">v{quotation.version}</span>
          </h1>
          <p className="text-sm text-slate-500">
            {quotation.opportunity ? (
              <Link href={`/opportunities/${quotation.opportunity.id}`} className="text-brand-600 hover:underline">
                {quotation.opportunity.title}
              </Link>
            ) : (
              "—"
            )}
          </p>
        </div>
        <Badge tone={STATUS_TONE[quotation.status]}>{quotation.status.replaceAll("_", " ")}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Details</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Payment terms" value={quotation.paymentTerms ?? "—"} />
            <Row label="Valid until" value={quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : "—"} />
            <Row label="Sent at" value={quotation.sentAt ? new Date(quotation.sentAt).toLocaleString() : "—"} />
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Actions</h2>
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-2">
            {canApprove && (
              <Button onClick={handleApprove} disabled={approveQuotation.isPending}>
                {approveQuotation.isPending ? "Approving…" : "Approve Internally"}
              </Button>
            )}
            {canSend && (
              <Button variant="secondary" onClick={handleSend} disabled={sendQuotation.isPending}>
                {sendQuotation.isPending ? "Sending…" : "Send to Customer"}
              </Button>
            )}
            {!canApprove && !canSend && <p className="text-sm text-slate-500">No actions available for this status.</p>}
          </div>
        </Card>

        <Card className="col-span-2 overflow-hidden p-0">
          <h2 className="p-5 pb-3 text-sm font-semibold text-slate-900">Line Items</h2>
          <table className="w-full text-sm">
            <thead className="border-y border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Description</th>
                <th className="px-4 py-2.5">Qty</th>
                <th className="px-4 py-2.5">Unit price</th>
                <th className="px-4 py-2.5">Disc %</th>
                <th className="px-4 py-2.5">Tax %</th>
                <th className="px-4 py-2.5">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotation.lineItems?.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-3 text-slate-900">{line.description}</td>
                  <td className="px-4 py-3 text-slate-600">{line.quantity}</td>
                  <td className="px-4 py-3 text-slate-600">{Number(line.unitPrice).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">{line.discountPct}%</td>
                  <td className="px-4 py-3 text-slate-600">{line.taxPct}%</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{Number(line.lineTotal).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ml-auto max-w-xs space-y-1 p-5 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>{quotation.currency} {Number(quotation.subtotal).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Discount</span>
              <span>-{quotation.currency} {Number(quotation.discountTotal).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Tax</span>
              <span>{quotation.currency} {Number(quotation.taxTotal).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-900">
              <span>Grand total</span>
              <span>{quotation.currency} {Number(quotation.grandTotal).toLocaleString()}</span>
            </div>
          </div>
        </Card>
      </div>
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
