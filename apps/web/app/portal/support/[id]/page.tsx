"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { usePortalTicket, useAddPortalTicketComment, TICKET_STATUS_TONE, TICKET_PRIORITY_TONE } from "@/lib/portal";
import { Badge, Button, Card } from "@/components/ui";

export default function PortalTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: ticket, isLoading } = usePortalTicket(params.id);
  const addComment = useAddPortalTicketComment(params.id);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!ticket) return <p className="text-sm text-slate-500">Ticket not found.</p>;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await addComment.mutateAsync(body);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add comment");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{ticket.code}</p>
          <h1 className="text-xl font-semibold text-primary">{ticket.subject}</h1>
          <p className="text-sm text-slate-500">Opened {new Date(ticket.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge tone={TICKET_STATUS_TONE[ticket.status] ?? "slate"}>{ticket.status.replaceAll("_", " ")}</Badge>
          <Badge tone={TICKET_PRIORITY_TONE[ticket.priority] ?? "slate"}>{ticket.priority}</Badge>
        </div>
      </div>

      {ticket.description && (
        <Card className="p-5">
          <h2 className="mb-2 text-sm font-semibold text-primary">Description</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{ticket.description}</p>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">Conversation</h2>
        {!ticket.comments || ticket.comments.length === 0 ? (
          <p className="text-sm text-slate-500">No comments yet.</p>
        ) : (
          <ul className="space-y-3">
            {ticket.comments.map((c) => (
              <li key={c.id} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
                <p className="whitespace-pre-wrap text-sm text-primary">{c.body}</p>
                <p className="mt-1.5 text-xs text-slate-400">{new Date(c.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}

        {ticket.status !== "CLOSED" && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={5000}
              required
              placeholder="Add a comment…"
              className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-surface px-3.5 py-2.5 text-sm text-primary shadow-sm placeholder:text-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            {error && <div className="rounded-md bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>}
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={addComment.isPending || !body.trim()}>
                {addComment.isPending ? "Posting…" : "Post Comment"}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
