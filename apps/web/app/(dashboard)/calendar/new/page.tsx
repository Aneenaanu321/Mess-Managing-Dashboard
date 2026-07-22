"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateCalendarEvent, CalendarEventType, CALENDAR_EVENT_TYPE_LABELS } from "@/lib/calendar";
import { Button, Card, Input, Label, Select } from "@/components/ui";

const TYPES = Object.keys(CALENDAR_EVENT_TYPE_LABELS) as CalendarEventType[];

export default function NewCalendarEventPage() {
  const router = useRouter();
  const createEvent = useCreateCalendarEvent();
  const [form, setForm] = useState({ type: "FOLLOW_UP" as CalendarEventType, title: "", startAt: "", endAt: "" });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createEvent.mutateAsync({
        type: form.type,
        title: form.title,
        startAt: new Date(form.startAt).toISOString(),
        endAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
      });
      router.push("/calendar");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-xl font-semibold text-primary">New Calendar Event</h1>
      <Card className="p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="type">Type</Label>
            <Select id="type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CalendarEventType })}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {CALENDAR_EVENT_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="startAt">Starts at</Label>
            <Input id="startAt" type="datetime-local" required value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="endAt">Ends at (optional)</Label>
            <Input id="endAt" type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={createEvent.isPending}>
            {createEvent.isPending ? "Creating…" : "Create Event"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
