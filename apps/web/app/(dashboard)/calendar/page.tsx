"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Plus } from "lucide-react";
import { useCalendarEvents, useCompleteCalendarEvent, CalendarEvent, CALENDAR_EVENT_TYPE_LABELS } from "@/lib/calendar";
import { Badge, Button, Card } from "@/components/ui";

function groupByDay(events: CalendarEvent[]) {
  const groups = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = new Date(event.startAt).toDateString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(event);
  }
  return Array.from(groups.entries());
}

export default function CalendarPage() {
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const { data: events, isLoading, isError } = useCalendarEvents({ includeCompleted });
  const complete = useCompleteCalendarEvent();

  const grouped = groupByDay(events ?? []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">Sales</p>
          <h1 className="font-display mt-1 text-2xl font-semibold tracking-tight text-slate-900">Calendar &amp; Follow-ups</h1>
          <p className="mt-1 text-sm text-slate-500">Your upcoming meetings, site visits, and follow-up reminders.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIncludeCompleted((v) => !v)}
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            {includeCompleted ? "Hide completed" : "Show completed"}
          </button>
          <Link href="/calendar/new">
            <Button>
              <Plus size={16} />
              New Event
            </Button>
          </Link>
        </div>
      </div>

      {isError && <Card className="p-4 text-sm text-red-600">Couldn&apos;t load your calendar.</Card>}
      {isLoading && <Card className="p-8 text-sm text-slate-500">Loading…</Card>}

      {!isLoading && grouped.length === 0 && (
        <Card className="px-8 py-14 text-center">
          <p className="font-medium text-slate-800">Nothing scheduled</p>
          <p className="mt-1 text-sm text-slate-500">Create a follow-up or meeting to see it here.</p>
        </Card>
      )}

      {grouped.map(([day, dayEvents]) => (
        <Card key={day} className="overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {day}
          </div>
          <div className="divide-y divide-slate-100">
            {dayEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Badge tone={event.completedAt ? "green" : "blue"}>{CALENDAR_EVENT_TYPE_LABELS[event.type]}</Badge>
                  <div>
                    <p className={`text-sm font-medium ${event.completedAt ? "text-slate-400 line-through" : "text-slate-900"}`}>{event.title}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(event.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {event.opportunity ? ` · ${event.opportunity.code}` : ""}
                    </p>
                  </div>
                </div>
                {!event.completedAt && (
                  <button
                    type="button"
                    onClick={() => complete.mutate(event.id)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <CheckCircle2 size={14} />
                    Mark done
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
