"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useOpportunity, useChangeOpportunityStage, OPPORTUNITY_STAGES, STAGE_TONE, LOSS_REASONS } from "@/lib/opportunities";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Card, Select, Label, Input } from "@/components/ui";

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: opportunity, isLoading } = useOpportunity(params.id);
  const { data: user } = useCurrentUser();
  const changeStage = useChangeOpportunityStage();

  const [nextStage, setNextStage] = useState("");
  const [lossReason, setLossReason] = useState(LOSS_REASONS[0]);
  const [lossNote, setLossNote] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!opportunity) return <p className="text-sm text-slate-500">Opportunity not found.</p>;

  const isClosed = opportunity.stage === "WON" || opportunity.stage === "LOST";
  const canChangeStage = hasPermission(user, "opportunity:change_stage");

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

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{opportunity.code}</p>
          <h1 className="text-xl font-semibold text-slate-900">{opportunity.title}</h1>
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
        <Badge tone={STAGE_TONE[opportunity.stage]}>{opportunity.stage.replaceAll("_", " ")}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Details</h2>
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
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Change Stage</h2>
          {isClosed ? (
            <p className="text-sm text-slate-500">This opportunity is {opportunity.stage.toLowerCase()} and cannot move further.</p>
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
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button onClick={handleChangeStage} disabled={changeStage.isPending}>
                {changeStage.isPending ? "Updating…" : "Update Stage"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">You don&apos;t have permission to change the stage.</p>
          )}
        </Card>

        <Card className="col-span-2 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Stage History</h2>
          {!opportunity.stageHistory || opportunity.stageHistory.length === 0 ? (
            <p className="text-sm text-slate-500">No stage history yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {opportunity.stageHistory.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
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
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
