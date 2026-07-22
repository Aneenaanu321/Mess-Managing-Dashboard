"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { useCustomerPO, useVerifyCustomerPO, useRecordAdvancePayment, CUSTOMER_PO_STATUS_TONE } from "@/lib/purchase-orders";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Card } from "@/components/ui";
import { FileAttachments } from "@/components/FileAttachments";
import { useConfirm } from "@/components/ConfirmDialog";

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: po, isLoading } = useCustomerPO(params.id);
  const { data: user } = useCurrentUser();
  const verify = useVerifyCustomerPO(params.id);
  const recordAdvance = useRecordAdvancePayment(params.id);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!po) return <p className="text-sm text-slate-500">Purchase order not found.</p>;

  const canManage = hasPermission(user, "customer_po:create");
  const steps = [
    { key: "uploaded", label: "PO logged / document uploaded", done: true },
    { key: "match", label: "Amount matches quotation", done: !po.amountMismatch },
    {
      key: "verify",
      label: "PO verified → sales order created",
      done: po.status === "VERIFIED" || !!po.salesOrder,
    },
    {
      key: "advance",
      label: "Advance payment recorded",
      done: Number(po.advanceRequired) === 0 || !!po.advanceReceivedAt,
    },
    {
      key: "ready",
      label: "Ready for delivery handoff",
      done:
        (po.status === "VERIFIED" || !!po.salesOrder) &&
        !po.amountMismatch &&
        (Number(po.advanceRequired) === 0 || !!po.advanceReceivedAt),
    },
  ];
  const nextStep = steps.find((s) => !s.done);

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
          <h1 className="text-xl font-semibold text-primary">{po.poNumber}</h1>
          <p className="text-sm text-slate-500">{po.customer?.name}</p>
        </div>
        <Badge tone={CUSTOMER_PO_STATUS_TONE[po.status]}>{po.status}</Badge>
      </div>

      {po.amountMismatch && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          The PO amount doesn&apos;t match the linked quotation&apos;s grand total. Please reconcile before verifying.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>
      )}

      <Card className="mb-4 p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">PO intake checklist</h2>
        <ol className="space-y-2">
          {steps.map((step, i) => (
            <li key={step.key} className="flex items-start gap-2 text-sm">
              {step.done ? (
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
              ) : (
                <Circle size={16} className="mt-0.5 shrink-0 text-slate-300" />
              )}
              <span className={step.done ? "text-slate-500 line-through" : "font-medium text-primary"}>
                {i + 1}. {step.label}
              </span>
            </li>
          ))}
        </ol>
        {canManage && nextStep?.key === "verify" && po.status === "RECEIVED" && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-700">
            <p className="text-sm text-slate-600">Next: verify PO and create the fulfillment sales order.</p>
            <Button
              onClick={async () => {
                const ok = await confirm({
                  title: "Verify purchase order?",
                  message: "This matches the PO to its quotation and creates the fulfillment sales order.",
                  confirmLabel: "Verify PO",
                });
                if (!ok) return;
                runAction(() => verify.mutateAsync());
              }}
              disabled={verify.isPending || po.amountMismatch}
            >
              {verify.isPending ? "Verifying…" : "Verify PO"}
            </Button>
          </div>
        )}
        {canManage && nextStep?.key === "advance" && po.status === "VERIFIED" && !po.advanceReceivedAt && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-700">
            <p className="text-sm text-slate-600">
              Next: record advance before a project can be created for {po.salesOrder?.code ?? "this order"}.
            </p>
            <Button onClick={() => runAction(() => recordAdvance.mutateAsync())} disabled={recordAdvance.isPending}>
              {recordAdvance.isPending ? "Recording…" : "Record Advance Payment"}
            </Button>
          </div>
        )}
        {nextStep?.key === "match" && (
          <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">Reconcile the PO amount with the quotation before verifying.</p>
        )}
        {!nextStep && (
          <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">
            Intake complete. Continue on{" "}
            <Link href="/handoffs" className="underline">
              Handoffs
            </Link>
            .
          </p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Details</h2>
          <dl className="space-y-2 text-sm">
            <Row label="PO Number" value={po.poNumber} />
            <Row label="Amount" value={`${Number(po.amount).toLocaleString()} ${po.currency}`} />
            <Row label="Advance Required" value={`${Number(po.advanceRequired).toLocaleString()} ${po.currency}`} />
            <Row label="Received At" value={new Date(po.receivedAt).toLocaleString()} />
            <Row label="Deal" value={po.opportunity ? `${po.opportunity.code} — ${po.opportunity.title}` : "—"} />
            <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-700">
              <dt className="text-slate-500">Sales Order</dt>
              <dd className="font-medium text-primary">
                {po.salesOrder ? (
                  <Link href={`/order-completed/${po.salesOrder.id}`} className="text-brand-700 hover:underline">
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
          <h2 className="mb-3 text-sm font-semibold text-primary">Quotation</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Code" value={po.quotation?.code ?? "—"} />
            <Row label="Grand Total" value={po.quotation ? `${Number(po.quotation.grandTotal).toLocaleString()} ${po.quotation.currency}` : "—"} />
            <Row label="Status" value={po.quotation?.status ?? "—"} />
          </dl>
        </Card>
      </div>

      <div className="mt-4">
        <FileAttachments entityType="CustomerPO" entityId={po.id} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-700">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-primary">{value}</dd>
    </div>
  );
}
