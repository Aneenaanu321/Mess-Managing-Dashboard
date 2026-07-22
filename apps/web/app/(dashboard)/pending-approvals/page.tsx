"use client";

import { useState } from "react";
import Link from "next/link";
import { usePendingApprovals, useDecideApproval, Approval } from "@/lib/approvals";
import { Button, Card } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { getPageLabel, getSectionForPage } from "@/lib/nav-labels";

export default function ApprovalsPage() {
  const { data: approvals, isLoading, isError } = usePendingApprovals();
  const decide = useDecideApproval();
  const confirm = useConfirm();
  const [commentById, setCommentById] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function handleDecide(approval: Approval, action: "APPROVE" | "REJECT") {
    setError(null);
    if (action === "REJECT") {
      const ok = await confirm({
        title: "Reject approval?",
        message: `Reject the discount/price override request for ${approval.quotation?.code ?? "this item"}? The quotation stays in draft until revised.`,
        confirmLabel: "Reject",
        variant: "danger",
      });
      if (!ok) return;
    }
    try {
      await decide.mutateAsync({ id: approval.id, action, comment: commentById[approval.id] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decide");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">{getSectionForPage("/pending-approvals")}</p>
        <h1 className="font-display mt-1 text-2xl font-semibold tracking-tight text-primary">{getPageLabel("/pending-approvals")}</h1>
        <p className="mt-1 text-sm text-slate-500">Price quotes awaiting a discount or price-override decision.</p>
      </div>

      {error && <Card className="p-4 text-sm text-red-600 dark:text-red-400">{error}</Card>}
      {isError && <Card className="p-4 text-sm text-red-600 dark:text-red-400">Couldn&apos;t load approvals.</Card>}
      {isLoading && <Card className="p-8 text-sm text-slate-500">Loading…</Card>}
      {!isLoading && (approvals?.length ?? 0) === 0 && (
        <Card className="px-8 py-14 text-center">
          <p className="font-medium text-primary">Nothing pending</p>
          <p className="mt-1 text-sm text-slate-500">{getPageLabel("/orders")} that need Sales Manager/Director sign-off will show up here.</p>
        </Card>
      )}

      {approvals?.map((approval) => (
        <Card key={approval.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {approval.quotation ? (
                <>
                  <Link href={`/orders/${approval.quotation.id}`} className="font-semibold text-brand-700 hover:underline">
                    {approval.quotation.code}
                  </Link>
                  <p className="text-sm text-slate-600">{approval.quotation.customer.name}</p>
                  <p className="mt-0.5 text-sm font-medium text-primary">
                    {Number(approval.quotation.grandTotal).toLocaleString()} {approval.quotation.currency}
                  </p>
                </>
              ) : (
                <p className="font-medium text-primary">
                  {approval.entityType} #{approval.entityId.slice(-8)}
                </p>
              )}
              <p className="mt-1.5 text-xs text-slate-500">
                Requested by {approval.requestedBy.firstName} {approval.requestedBy.lastName} on{" "}
                {new Date(approval.requestedAt).toLocaleDateString()}
              </p>
              {approval.reason && <p className="mt-1 text-xs text-amber-700">{approval.reason}</p>}
            </div>

            <div className="flex flex-col items-end gap-2">
              <input
                placeholder="Comment (optional)"
                value={commentById[approval.id] ?? ""}
                onChange={(e) => setCommentById((prev) => ({ ...prev, [approval.id]: e.target.value }))}
                className="w-56 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleDecide(approval, "REJECT")} disabled={decide.isPending}>
                  Reject
                </Button>
                <Button size="sm" onClick={() => handleDecide(approval, "APPROVE")} disabled={decide.isPending}>
                  Approve
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
