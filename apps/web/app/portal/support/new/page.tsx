"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreatePortalTicket } from "@/lib/portal";
import { Button, Card, Input, Label, Select } from "@/components/ui";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function NewPortalTicketPage() {
  const router = useRouter();
  const createTicket = useCreatePortalTicket();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const ticket = await createTicket.mutateAsync({
        subject,
        description: description || undefined,
        priority,
      });
      router.push(`/portal/support/${ticket.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create ticket");
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display mb-5 text-2xl font-semibold tracking-tight text-primary">New Support Ticket</h1>

      <Card className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={200} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={5000}
              className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-surface px-3.5 py-2.5 text-sm text-primary shadow-sm placeholder:text-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="Describe the issue you're facing…"
            />
          </div>
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full sm:w-48">
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>

          {error && <div className="rounded-md bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" disabled={createTicket.isPending}>
              {createTicket.isPending ? "Submitting…" : "Submit Ticket"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
