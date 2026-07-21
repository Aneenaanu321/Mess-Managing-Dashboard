"use client";

import { useState } from "react";
import { useActivities, useCreateActivity, ActivityScope, ActivityType, ACTIVITY_TYPE_LABELS } from "@/lib/activities";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Card, Select } from "@/components/ui";

const TYPES = Object.keys(ACTIVITY_TYPE_LABELS) as ActivityType[];

/** Drop-in activity/note log, shared by Lead, Customer, and Opportunity detail pages. */
export function ActivityTimeline({ scope }: { scope: ActivityScope }) {
  const { data: user } = useCurrentUser();
  const { data: activities, isLoading } = useActivities(scope);
  const createActivity = useCreateActivity(scope);
  const [type, setType] = useState<ActivityType>("NOTE");
  const [subject, setSubject] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleLog() {
    if (!subject.trim()) return;
    setError(null);
    try {
      await createActivity.mutateAsync({ type, subject });
      setSubject("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log activity");
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Activity Timeline</h2>

      {hasPermission(user, "activity:create") && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Select value={type} onChange={(e) => setType(e.target.value as ActivityType)} className="w-32 shrink-0">
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {ACTIVITY_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
          <input
            placeholder="Log a call, note, meeting..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLog()}
            className="min-w-[160px] flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          <Button size="sm" onClick={handleLog} disabled={createActivity.isPending || !subject.trim()}>
            Log
          </Button>
        </div>
      )}
      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {!isLoading && (activities?.length ?? 0) === 0 && <p className="text-sm text-slate-400">No activity logged yet.</p>}

      <ul className="space-y-3">
        {activities?.map((activity) => (
          <li key={activity.id} className="flex gap-3 border-l-2 border-slate-100 pl-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge tone="slate">{ACTIVITY_TYPE_LABELS[activity.type]}</Badge>
                <p className="text-xs text-slate-400">{new Date(activity.occurredAt).toLocaleString()}</p>
              </div>
              <p className="mt-1 text-sm text-slate-800">{activity.subject}</p>
              {activity.actor && (
                <p className="mt-0.5 text-xs text-slate-400">
                  {activity.actor.firstName} {activity.actor.lastName}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
