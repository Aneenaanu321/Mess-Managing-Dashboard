"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCustomerPO, useVerifyCustomerPO, useRecordAdvancePayment, CUSTOMER_PO_STATUS_TONE } from "@/lib/purchase-orders";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Card } from "@/components/ui";

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: po, isLoading } = useCustomerPO(params.id);
  const { data: user } = useCurrentUser();
  const verify = useVerifyCustomerPO(params.id);
  const recordAdvance = useRecordAdvancePayment(params.id);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!po) return <p className="text-sm text-slate-500">Purchase order not found.</p>;

  const canManage = hasPermission(user, "customer_po:create");

  async function runAction(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{po.code}</p>
          <h1 className="text-xl font-semibold text-slate-900">{po.poNumber}</h1>
          <p className="text-sm text-slate-500">{po.customer?.name}</p>
        </div>
        <Badge tone={CUSTOMER_PO_STATUS_TONE[po.status]}>{po.status}</Badge>
      </div>

      {po.amountMismatch && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          The PO amount doesn&apos;t match the linked quotation&apos;s grand total. Please reconcile before verifying.
        </div>
      )}

      {error && <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {canManage && (po.status === "RECEIVED" || (po.status === "VERIFIED" && !po.advanceReceivedAt)) && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
          {po.status === "RECEIVED" ? (
            <>
              <p className="text-sm text-slate-600">Match this PO to its quotation and create the fulfillment sales order.</p>
              <Button onClick={() => runAction(() => verify.mutateAsync())} disabled={verify.isPending}>
                {verify.isPending ? "Verifying…" : "Verify PO"}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Record the advance payment before a Project can be created for {po.salesOrder?.code ?? "this order"}.
              </p>
              <Button onClick={() => runAction(() => recordAdvance.mutateAsync())} disabled={recordAdvance.isPending}>
                {recordAdvance.isPending ? "Recording…" : "Record Advance Payment"}
              </Button>
            </>
          )}
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Details</h2>
          <dl className="space-y-2 text-sm">
            <Row label="PO Number" value={po.poNumber} />
            <Row label="Amount" value={`${Number(po.amount).toLocaleString()} ${po.currency}`} />
            <Row label="Advance Required" value={`${Number(po.advanceRequired).toLocaleString()} ${po.currency}`} />
            <Row label="Received At" value={new Date(po.receivedAt).toLocaleString()} />
            <Row label="Opportunity" value={po.opportunity ? `${po.opportunity.code} — ${po.opportunity.title}` : "—"} />
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Sales Order</dt>
              <dd className="font-medium text-slate-900">
                {po.salesOrder ? (
                  <Link href={`/sales-orders/${po.salesOrder.id}`} className="text-brand-700 hover:underline">
                    {po.salesOrder.code} ({po.salesOrder.status.replaceAll("_", " ")})
                  </Link>
                ) : (
                  "Not yet created"
                )}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Quotation</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Code" value={po.quotation?.code ?? "—"} />
            <Row label="Grand Total" value={po.quotation ? `${Number(po.quotation.grandTotal).toLocaleString()} ${po.quotation.currency}` : "—"} />
            <Row label="Status" value={po.quotation?.status ?? "—"} />
          </dl>
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
