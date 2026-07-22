"use client";

import { useParams } from "next/navigation";
import { usePortalPurchaseOrder, PO_STATUS_TONE } from "@/lib/portal";
import { Badge, Card } from "@/components/ui";

export default function PortalPurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: po, isLoading } = usePortalPurchaseOrder(params.id);

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!po) return <p className="text-sm text-slate-500">Purchase order not found.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{po.code}</p>
          <h1 className="text-xl font-semibold text-primary">{po.poNumber}</h1>
        </div>
        <Badge tone={PO_STATUS_TONE[po.status] ?? "slate"}>{po.status}</Badge>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">Details</h2>
        <dl className="space-y-2 text-sm">
          <Row label="Amount" value={`${Number(po.amount).toLocaleString()} ${po.currency}`} />
          <Row label="Received" value={new Date(po.receivedAt).toLocaleString()} />
          <Row label="Quotation" value={po.quotation?.code ?? "—"} />
          <Row label="Sales Order" value={po.salesOrder ? `${po.salesOrder.code} (${po.salesOrder.status.replaceAll("_", " ")})` : "Not yet created"} />
        </dl>
      </Card>
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
