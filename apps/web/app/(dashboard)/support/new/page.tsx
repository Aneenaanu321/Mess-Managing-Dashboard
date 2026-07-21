"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateTicket, TICKET_PRIORITIES } from "@/lib/support";
import { useCustomers } from "@/lib/customers";
import { useDevices } from "@/lib/devices";
import { Button, Input, Label, Select, Card } from "@/components/ui";

export default function NewTicketPage() {
  const router = useRouter();
  const createTicket = useCreateTicket();
  const { data: customersData } = useCustomers({ pageSize: 100 });
  const customers = customersData?.data ?? [];

  const [form, setForm] = useState({
    subject: "",
    description: "",
    priority: "MEDIUM" as (typeof TICKET_PRIORITIES)[number],
    customerId: "",
    deviceId: "",
  });
  const { data: devicesData } = useDevices({ page: 1 });
  const devices = devicesData?.data ?? [];
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const ticket = await createTicket.mutateAsync({
        subject: form.subject,
        description: form.description || undefined,
        priority: form.priority,
        customerId: form.customerId,
        deviceId: form.deviceId || undefined,
      });
      router.push(`/support/${ticket.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">New Support Ticket</h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerId">Customer</Label>
              <Select id="customerId" required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select id="priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as never })}>
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="deviceId">Related device (optional)</Label>
            <Select id="deviceId" value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })}>
              <option value="">None</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.serialNumber} — {d.type.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <textarea
              id="description"
              rows={4}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTicket.isPending}>
              {createTicket.isPending ? "Creating…" : "Create Ticket"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
