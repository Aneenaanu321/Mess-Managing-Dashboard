"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  useTicket,
  useUpdateTicket,
  useAddTicketComment,
  TICKET_STATUSES,
  TICKET_STATUS_TONE,
  TICKET_PRIORITY_TONE,
  TicketStatus,
} from "@/lib/support";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Card, Select } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: ticket, isLoading } = useTicket(params.id);
  const { data: user } = useCurrentUser();
  const updateTicket = useUpdateTicket();
  const addComment = useAddTicketComment();
  const [error, setError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [posting, setPosting] = useState(false);
  const confirm = useConfirm();

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!ticket) return <p className="text-sm text-slate-500">Ticket not found.</p>;

  const canManage = hasPermission(user, "support:manage");

  async function handleStatusChange(status: string) {
    if (status === "CLOSED" && ticket!.status !== "CLOSED") {
      const ok = await confirm({
        title: "Close ticket?",
        message: "The customer will no longer be able to reopen this ticket without support.",
        confirmLabel: "Close ticket",
        variant: "danger",
      });
      if (!ok) return;
    }
    setError(null);
    try {
      await updateTicket.mutateAsync({ id: ticket!.id, input: { status: status as TicketStatus } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update ticket");
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await addComment.mutateAsync({ id: ticket!.id, body: commentBody });
      setCommentBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{ticket.code}</p>
          <h1 className="text-xl font-semibold text-primary">{ticket.subject}</h1>
          <p className="text-sm text-slate-500">{ticket.customer?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={TICKET_PRIORITY_TONE[ticket.priority]}>{ticket.priority}</Badge>
          {canManage ? (
            <Select value={ticket.status} onChange={(e) => handleStatusChange(e.target.value)} className="w-40">
              {TICKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          ) : (
            <Badge tone={TICKET_STATUS_TONE[ticket.status]}>{ticket.status.replaceAll("_", " ")}</Badge>
          )}
        </div>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Details</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Device" value={ticket.device?.serialNumber ?? "—"} />
            <Row label="Raised by" value={ticket.raisedBy ? `${ticket.raisedBy.firstName} ${ticket.raisedBy.lastName}` : "—"} />
            <Row label="Assignee" value={ticket.assignee ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}` : "Unassigned"} />
            <Row label="Response due" value={ticket.slaResponseDueAt ? new Date(ticket.slaResponseDueAt).toLocaleString() : "—"} />
            <Row label="Resolution due" value={ticket.slaResolutionDueAt ? new Date(ticket.slaResolutionDueAt).toLocaleString() : "—"} />
            <Row label="Reopen count" value={String(ticket.reopenCount)} />
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Description</h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">{ticket.description || "No description provided."}</p>
          {ticket.resolutionNote && (
            <div className="mt-3 border-t border-slate-100 dark:border-slate-700 pt-3">
              <p className="mb-1 text-xs font-medium uppercase text-slate-400">Resolution note</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{ticket.resolutionNote}</p>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">Comments</h2>
        <div className="mb-4 space-y-3">
          {ticket.comments?.length ? (
            ticket.comments.map((c) => (
              <div key={c.id} className="rounded-md border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 text-sm">
                <p className="text-slate-700 dark:text-slate-300">{c.body}</p>
                <p className="mt-1 text-xs text-slate-400">{new Date(c.createdAt).toLocaleString()}{c.isInternal ? " · Internal" : ""}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No comments yet.</p>
          )}
        </div>
        {canManage && (
          <form onSubmit={handleAddComment} className="flex gap-2">
            <textarea
              rows={2}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Add a comment…"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
            />
            <Button type="submit" disabled={posting}>
              {posting ? "Posting…" : "Post"}
            </Button>
          </form>
        )}
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
