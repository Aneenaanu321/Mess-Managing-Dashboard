"use client";

import { useParams } from "next/navigation";
import { useSupplierPO, SUPPLIER_PO_STATUS_TONE } from "@/lib/procurement";
import { Badge, Card } from "@/components/ui";

export default function SupplierPODetailPage() {
  const params = useParams<{ id: string }>();
  const { data: po, isLoading } = useSupplierPO(params.id);

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!po) return <p className="text-sm text-slate-500">Supplier purchase order not found.</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{po.code}</p>
          <h1 className="text-xl font-semibold text-primary">{po.vendor?.name}</h1>
          <p className="text-sm text-slate-500">{po.vendor?.contactName ?? "—"}</p>
        </div>
        <Badge tone={SUPPLIER_PO_STATUS_TONE[po.status]}>{po.status.replaceAll("_", " ")}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Details</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Total Amount" value={`${Number(po.totalAmount).toLocaleString()} ${po.currency}`} />
            <Row label="Expected Date" value={po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : "—"} />
            <Row label="Vendor Email" value={po.vendor?.email ?? "—"} />
            <Row label="Vendor Phone" value={po.vendor?.phone ?? "—"} />
            <Row label="Created" value={new Date(po.createdAt).toLocaleString()} />
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Line Items</h2>
          <div className="space-y-2 text-sm">
            {(po.lineItems ?? []).map((li) => (
              <div key={li.id} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                <div>
                  <p className="font-medium text-primary">{li.product.sku}</p>
                  <p className="text-xs text-slate-500">{li.product.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-primary">
                    {Number(li.quantity)} × {Number(li.unitCost).toLocaleString()} {po.currency}
                  </p>
                  <p className="text-xs text-slate-500">Received: {Number(li.receivedQty)}</p>
                </div>
              </div>
            ))}
            {(po.lineItems ?? []).length === 0 && <p className="text-slate-500">No line items.</p>}
          </div>
        </Card>
      </div>
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
