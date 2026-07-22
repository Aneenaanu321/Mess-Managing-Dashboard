"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Printer } from "lucide-react";
import {
  useOpportunity,
  useChangeOpportunityStage,
  useUpdateOpportunity,
  OPPORTUNITY_STAGES,
  STAGE_TONE,
  LOSS_REASONS,
} from "@/lib/opportunities";
import { useScheduleMeeting } from "@/lib/sales-ops";
import { useAssignableUsers } from "@/lib/tasks";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Card, Select, Label, Input } from "@/components/ui";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { PresalesSection } from "@/components/PresalesSection";

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: opportunity, isLoading } = useOpportunity(params.id);
  const { data: user } = useCurrentUser();
  const changeStage = useChangeOpportunityStage();
  const updateOpp = useUpdateOpportunity();
  const scheduleMeeting = useScheduleMeeting();
  const { data: assignees } = useAssignableUsers();

  const [nextStage, setNextStage] = useState("");
  const [lossReason, setLossReason] = useState(LOSS_REASONS[0]);
  const [lossNote, setLossNote] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [internalNotes, setInternalNotes] = useState<string | null>(null);
  const [meetType, setMeetType] = useState("MEETING");
  const [meetTitle, setMeetTitle] = useState("");
  const [meetStart, setMeetStart] = useState("");
  const [meetOwnerId, setMeetOwnerId] = useState("");

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!opportunity) return <p className="text-sm text-slate-500">Deal not found.</p>;

  const isClosed = opportunity.stage === "WON" || opportunity.stage === "LOST";
  const canChangeStage = hasPermission(user, "opportunity:change_stage");
  const notesValue = internalNotes ?? opportunity.internalNotes ?? "";

  async function handleChangeStage() {
    setError(null);
    if (!nextStage) {
      setError("Select a stage to move to");
      return;
    }
    try {
      await changeStage.mutateAsync({
        id: opportunity!.id,
        input: {
          stage: nextStage as never,
          ...(nextStage === "LOST" ? { lossReason, lossNote: lossNote || undefined, competitor: competitor || undefined } : {}),
        },
      });
      setNextStage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stage change failed");
    }
  }

  async function handleSaveNotes() {
    try {
      await updateOpp.mutateAsync({ id: opportunity!.id, input: { internalNotes: notesValue } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notes");
    }
  }

  async function handleSchedule() {
    if (!meetTitle.trim() || !meetStart) {
      setError("Meeting title and start time are required");
      return;
    }
    setError(null);
    try {
      await scheduleMeeting.mutateAsync({
        opportunityId: opportunity!.id,
        type: meetType,
        title: meetTitle.trim(),
        startAt: new Date(meetStart).toISOString(),
        ownerId: meetOwnerId || undefined,
      });
      setMeetTitle("");
      setMeetStart("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule meeting");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-400">{opportunity.code}</p>
          <h1 className="text-xl font-semibold text-primary">{opportunity.title}</h1>
          <p className="text-sm text-slate-500">
            {opportunity.customer ? (
              <Link href={`/customers/${opportunity.customer.id}`} className="text-brand-600 hover:underline">
                {opportunity.customer.name}
              </Link>
            ) : (
              "—"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/active-deals/${opportunity.id}/summary`}>
            <Button variant="secondary" size="sm">
              <Printer size={14} />
              Deal pack
            </Button>
          </Link>
          <Badge tone={STAGE_TONE[opportunity.stage]}>{opportunity.stage.replaceAll("_", " ")}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Details</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Estimated value" value={`${opportunity.currency} ${Number(opportunity.estimatedValue).toLocaleString()}`} />
            <Row label="Probability" value={`${opportunity.probability}%`} />
            <Row
              label="Expected close"
              value={opportunity.expectedCloseDate ? new Date(opportunity.expectedCloseDate).toLocaleDateString() : "—"}
            />
            <Row label="Owner" value={opportunity.owner ? `${opportunity.owner.firstName} ${opportunity.owner.lastName}` : "Unassigned"} />
            {opportunity.stage === "LOST" && <Row label="Loss reason" value={opportunity.lossReason ?? "—"} />}
            {opportunity.competitor && <Row label="Competitor" value={opportunity.competitor} />}
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Change Stage</h2>
          {isClosed ? (
            <p className="text-sm text-slate-500">This deal is {opportunity.stage.toLowerCase()} and cannot move further.</p>
          ) : canChangeStage ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="nextStage">New stage</Label>
                <Select id="nextStage" value={nextStage} onChange={(e) => setNextStage(e.target.value)}>
                  <option value="">Select stage…</option>
                  {OPPORTUNITY_STAGES.filter((s) => s !== opportunity.stage).map((s) => (
                    <option key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              </div>
              {nextStage === "LOST" && (
                <>
                  <div>
                    <Label htmlFor="lossReason">Loss reason</Label>
                    <Select id="lossReason" value={lossReason} onChange={(e) => setLossReason(e.target.value)}>
                      {LOSS_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r.replaceAll("_", " ")}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="competitor">Competitor (optional)</Label>
                    <Input id="competitor" value={competitor} onChange={(e) => setCompetitor(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="lossNote">Note (optional)</Label>
                    <Input id="lossNote" value={lossNote} onChange={(e) => setLossNote(e.target.value)} />
                  </div>
                </>
              )}
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <Button onClick={handleChangeStage} disabled={changeStage.isPending}>
                {changeStage.isPending ? "Updating…" : "Update Stage"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">You don&apos;t have permission to change the stage.</p>
          )}
        </Card>

        {hasPermission(user, "calendar:manage") && !isClosed && (
          <Card className="col-span-2 p-5">
            <h2 className="mb-3 text-sm font-semibold text-primary">Schedule meeting / demo</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="meetType">Type</Label>
                <Select id="meetType" value={meetType} onChange={(e) => setMeetType(e.target.value)}>
                  <option value="MEETING">Meeting</option>
                  <option value="DEMO">Demo</option>
                  <option value="SITE_VISIT">Site visit</option>
                  <option value="FOLLOW_UP">Follow-up</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="meetOwner">Assignee</Label>
                <Select id="meetOwner" value={meetOwnerId} onChange={(e) => setMeetOwnerId(e.target.value)}>
                  <option value="">Deal owner (default)</option>
                  {(assignees ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="meetTitle">Title</Label>
                <Input id="meetTitle" value={meetTitle} onChange={(e) => setMeetTitle(e.target.value)} placeholder="Demo with facilities team" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="meetStart">Start</Label>
                <Input id="meetStart" type="datetime-local" value={meetStart} onChange={(e) => setMeetStart(e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <Button onClick={handleSchedule} disabled={scheduleMeeting.isPending}>
                {scheduleMeeting.isPending ? "Scheduling…" : "Add to calendar"}
              </Button>
            </div>
          </Card>
        )}

        {hasPermission(user, "opportunity:update") && (
          <Card className="col-span-2 p-5">
            <h2 className="mb-1 text-sm font-semibold text-primary">Internal notes</h2>
            <p className="mb-3 text-xs text-slate-500">Coordinator-only — not shown on customer exports.</p>
            <textarea
              value={notesValue}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-primary dark:border-slate-700 dark:bg-slate-900"
            />
            <div className="mt-2">
              <Button size="sm" variant="secondary" onClick={handleSaveNotes} disabled={updateOpp.isPending}>
                {updateOpp.isPending ? "Saving…" : "Save notes"}
              </Button>
            </div>
          </Card>
        )}

        <Card className="col-span-2 p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Stage History</h2>
          {!opportunity.stageHistory || opportunity.stageHistory.length === 0 ? (
            <p className="text-sm text-slate-500">No stage history yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {opportunity.stageHistory.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0 dark:border-slate-700"
                >
                  <span className="text-slate-600">
                    {entry.fromStage ? entry.fromStage.replaceAll("_", " ") : "—"} → {entry.toStage.replaceAll("_", " ")}
                    {entry.isRegression && <span className="ml-2 text-amber-600">(regression)</span>}
                  </span>
                  <span className="text-slate-400">{new Date(entry.enteredAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <PresalesSection opportunityId={opportunity.id} />
      </div>

      <div className="mt-4">
        <ActivityTimeline scope={{ opportunityId: opportunity.id }} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-700">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-primary">{value}</dd>
    </div>
  );
}
