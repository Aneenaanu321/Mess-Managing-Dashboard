"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useInvoice, useRecordPayment, INVOICE_STATUS_TONE, PAYMENT_METHODS, PaymentMethod } from "@/lib/finance";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: invoice, isLoading } = useInvoice(params.id);
  const { data: user } = useCurrentUser();
  const recordPayment = useRecordPayment();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!invoice) return <p className="text-sm text-slate-500">Invoice not found.</p>;

  const balanceDue = Number(invoice.totalAmount) - Number(invoice.amountPaid);
  const canRecordPayment = hasPermission(user, "finance:payment_record");

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await recordPayment.mutateAsync({ invoiceId: invoice!.id, input: { amount: Number(amount), method, reference: reference || undefined } });
      setAmount("");
      setReference("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{invoice.customer?.name}</p>
          <h1 className="text-xl font-semibold text-primary">{invoice.code}</h1>
          {invoice.milestoneLabel && <p className="text-sm text-slate-500">{invoice.milestoneLabel}</p>}
        </div>
        <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>{invoice.status.replaceAll("_", " ")}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-slate-400">Total</p>
          <p className="text-lg font-semibold text-primary">
            {invoice.currency} {Number(invoice.totalAmount).toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-slate-400">Paid</p>
          <p className="text-lg font-semibold text-emerald-600">
            {invoice.currency} {Number(invoice.amountPaid).toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-slate-400">Balance Due</p>
          <p className="text-lg font-semibold text-primary">
            {invoice.currency} {balanceDue.toLocaleString()}
          </p>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">Line Items</h2>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-700 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="py-2">Description</th>
              <th className="py-2">Qty</th>
              <th className="py-2">Unit Price</th>
              <th className="py-2">Tax %</th>
              <th className="py-2 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {invoice.lineItems?.map((li) => (
              <tr key={li.id}>
                <td className="py-2 text-primary">{li.description}</td>
                <td className="py-2 text-slate-600">{li.quantity}</td>
                <td className="py-2 text-slate-600">{li.unitPrice}</td>
                <td className="py-2 text-slate-600">{li.taxPct}%</td>
                <td className="py-2 text-right font-medium text-primary">{Number(li.lineTotal).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Payments</h2>
          {invoice.payments?.length ? (
            <ul className="space-y-2 text-sm">
              {invoice.payments.map((p) => (
                <li key={p.id} className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                  <span className="text-slate-600">
                    {p.method.replaceAll("_", " ")} {p.reference ? `· ${p.reference}` : ""}
                  </span>
                  <span className="font-medium text-primary">
                    {p.currency} {Number(p.amount).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No payments recorded yet.</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Record Payment</h2>
          {invoice.status === "PAID" ? (
            <p className="text-sm text-slate-500">This invoice is fully paid.</p>
          ) : invoice.status === "CANCELLED" ? (
            <p className="text-sm text-slate-500">This invoice is cancelled.</p>
          ) : canRecordPayment ? (
            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" min={0} step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="method">Method</Label>
                <Select id="method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="reference">Reference (optional)</Label>
                <Input id="reference" placeholder="Cheque no / transaction ID" value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <Button type="submit" disabled={submitting}>
                {submitting ? "Recording…" : "Record Payment"}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-slate-500">You don&apos;t have permission to record payments.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
