"use client";

import { useEffect, useState } from "react";
import { useActivities, useCreateActivity, ActivityScope, ActivityType, ACTIVITY_TYPE_LABELS } from "@/lib/activities";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Card, Input, Select } from "@/components/ui";

const TYPES = Object.keys(ACTIVITY_TYPE_LABELS) as ActivityType[];

const TEMPLATES: { label: string; type: ActivityType; subject: string }[] = [
  { label: "Called — no answer", type: "CALL", subject: "Called — no answer" },
  { label: "Email sent", type: "EMAIL", subject: "Email sent" },
  { label: "Meeting scheduled", type: "MEETING", subject: "Meeting scheduled" },
  { label: "Follow-up promised", type: "NOTE", subject: "Customer asked for follow-up" },
];

/** Drop-in activity/note log, shared by Lead, Customer, and Opportunity detail pages. */
export function ActivityTimeline({
  scope,
  defaultPhone,
}: {
  scope: ActivityScope;
  /** Prefill click-to-call (CTI-lite) from lead/contact phone. */
  defaultPhone?: string | null;
}) {
  const { data: user } = useCurrentUser();
  const { data: activities, isLoading } = useActivities(scope);
  const createActivity = useCreateActivity(scope);
  const [type, setType] = useState<ActivityType>("NOTE");
  const [subject, setSubject] = useState("");
  const [durationMins, setDurationMins] = useState("");
  const [callPhone, setCallPhone] = useState(defaultPhone ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultPhone) setCallPhone(defaultPhone);
  }, [defaultPhone]);

  async function handleLog(override?: { type: ActivityType; subject: string; body?: string }) {
    const nextType = override?.type ?? type;
    const nextSubject = (override?.subject ?? subject).trim();
    if (!nextSubject) return;
    setError(null);
    try {
      await createActivity.mutateAsync({
        type: nextType,
        subject: nextSubject,
        ...(override?.body ? { body: override.body } : {}),
        ...(durationMins && nextType === "CALL" ? { durationMins: Number(durationMins) } : {}),
      });
      if (!override) {
        setSubject("");
        setDurationMins("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log activity");
    }
  }

  async function handleCallAndLog() {
    const phone = callPhone.trim();
    if (!phone) {
      setError("Enter a phone number to call");
      return;
    }
    const dial = phone.replace(/[^\d+]/g, "");
    window.location.href = `tel:${dial}`;
    await handleLog({
      type: "CALL",
      subject: "Outbound call",
      body: `Dialed ${phone} (CTI-lite click-to-call)`,
    });
  }

  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-semibold text-primary">Activity Timeline</h2>

      {hasPermission(user, "activity:create") && (
        <>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {TEMPLATES.map((t) => (
              <Button
                key={t.label}
                size="sm"
                variant="secondary"
                disabled={createActivity.isPending}
                onClick={() => handleLog({ type: t.type, subject: t.subject })}
              >
                {t.label}
              </Button>
            ))}
          </div>
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
              className="min-w-[160px] flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:text-slate-300"
            />
            {type === "CALL" && (
              <>
                <Input
                  type="tel"
                  placeholder="Phone"
                  value={callPhone}
                  onChange={(e) => setCallPhone(e.target.value)}
                  className="w-36"
                  aria-label="Phone number for click-to-call"
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="Mins"
                  value={durationMins}
                  onChange={(e) => setDurationMins(e.target.value)}
                  className="w-20"
                  aria-label="Call duration minutes"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={createActivity.isPending || !callPhone.trim()}
                  onClick={handleCallAndLog}
                  title="Open dialer and log an outbound CALL activity"
                >
                  Call & log
                </Button>
              </>
            )}
            {type !== "CALL" && !!callPhone.trim() && (
              <Button
                size="sm"
                variant="secondary"
                disabled={createActivity.isPending}
                onClick={() => {
                  setType("CALL");
                  void handleCallAndLog();
                }}
              >
                Call & log
              </Button>
            )}
            <Button size="sm" onClick={() => handleLog()} disabled={createActivity.isPending || !subject.trim()}>
              Log
            </Button>
          </div>
        </>
      )}
      {error && <p className="mb-3 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {!isLoading && (activities?.length ?? 0) === 0 && <p className="text-sm text-slate-400">No activity logged yet.</p>}

      <ul className="space-y-3">
        {activities?.map((activity) => (
          <li key={activity.id} className="flex gap-3 border-l-2 border-slate-100 pl-3 dark:border-slate-700">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge tone="slate">{ACTIVITY_TYPE_LABELS[activity.type]}</Badge>
                <p className="text-xs text-slate-400">{new Date(activity.occurredAt).toLocaleString()}</p>
                {activity.durationMins != null && (
                  <p className="text-xs text-slate-400">{activity.durationMins} min</p>
                )}
              </div>
              <p className="mt-1 text-sm text-primary">{activity.subject}</p>
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
