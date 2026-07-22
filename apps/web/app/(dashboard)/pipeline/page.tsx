"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useOpportunities,
  useChangeOpportunityStage,
  OPPORTUNITY_STAGES,
  LOSS_REASONS,
  Opportunity,
  OpportunityStage,
} from "@/lib/opportunities";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Card, Select, Button, Label } from "@/components/ui";

const COLUMN_STYLE: Record<OpportunityStage, string> = {
  REQUIREMENT_GATHERING: "border-t-slate-400",
  SITE_SURVEY: "border-t-slate-400",
  TECHNICAL_DISCUSSION: "border-t-blue-400",
  DEMO: "border-t-blue-400",
  POC: "border-t-blue-400",
  SOLUTION_DESIGN: "border-t-amber-400",
  INTERNAL_REVIEW: "border-t-amber-400",
  QUOTATION_SENT: "border-t-amber-400",
  NEGOTIATION: "border-t-amber-400",
  WON: "border-t-emerald-500",
  LOST: "border-t-red-400",
};

function stageLabel(stage: OpportunityStage) {
  return stage.replaceAll("_", " ");
}

export default function PipelinePage() {
  const { data: user } = useCurrentUser();
  const canView = hasPermission(user, "opportunity:view");
  const canChangeStage = hasPermission(user, "opportunity:change_stage");
  const { data, isLoading, isError } = useOpportunities({ pageSize: 200 });
  const changeStage = useChangeOpportunityStage();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [lossModalFor, setLossModalFor] = useState<{ id: string; stage: OpportunityStage } | null>(null);
  const [lossReason, setLossReason] = useState(LOSS_REASONS[0]);
  const [lossNote, setLossNote] = useState("");

  const opportunities = data?.data ?? [];

  const columns: Record<OpportunityStage, Opportunity[]> = OPPORTUNITY_STAGES.reduce(
    (acc, stage) => ({ ...acc, [stage]: [] }),
    {} as Record<OpportunityStage, Opportunity[]>,
  );
  opportunities.forEach((opp) => {
    columns[opp.stage]?.push(opp);
  });

  async function handleMove(id: string, stage: OpportunityStage) {
    if (stage === "LOST") {
      setLossModalFor({ id, stage });
      return;
    }
    setPendingId(id);
    try {
      await changeStage.mutateAsync({ id, input: { stage } });
    } finally {
      setPendingId(null);
    }
  }

  async function confirmLoss() {
    if (!lossModalFor) return;
    setPendingId(lossModalFor.id);
    try {
      await changeStage.mutateAsync({
        id: lossModalFor.id,
        input: { stage: "LOST", lossReason, lossNote: lossNote || undefined },
      });
      setLossModalFor(null);
      setLossNote("");
    } finally {
      setPendingId(null);
    }
  }

  if (!canView) {
    return <p className="text-sm text-slate-500">You don&apos;t have permission to view the pipeline.</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-primary">Pipeline</h1>
        <p className="mt-1 text-sm text-slate-500">
          {opportunities.length} opportunities by stage — open a card to view details.
        </p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading pipeline…</p>}
      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load opportunities. Is the API running at <code>NEXT_PUBLIC_API_URL</code>?
        </p>
      )}

      {!isLoading && !isError && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {OPPORTUNITY_STAGES.map((stage) => (
            <section
              key={stage}
              className={`rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-surface p-4 shadow-card border-t-[3px] ${COLUMN_STYLE[stage]}`}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {stageLabel(stage)}
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {columns[stage].length}
                </span>
              </div>

              <div className="space-y-3">
                {columns[stage].length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-4 text-center text-xs text-slate-400">
                    No opportunities
                  </p>
                )}
                {columns[stage].map((opp) => (
                  <Card key={opp.id} className="overflow-hidden p-0 shadow-sm">
                    <Link href={`/opportunities/${opp.id}`} className="block p-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{opp.code}</p>
                      <p className="mt-1 text-sm font-semibold leading-snug text-primary">{opp.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{opp.customer?.name ?? "—"}</p>
                      <p className="mt-2 text-sm font-semibold text-brand-700">
                        {opp.currency} {Number(opp.estimatedValue).toLocaleString()}
                      </p>
                    </Link>
                    {canChangeStage && stage !== "WON" && stage !== "LOST" && (
                      <div className="border-t border-slate-100 dark:border-slate-700 px-3.5 py-2.5">
                        <Select
                          className="text-xs"
                          value=""
                          disabled={pendingId === opp.id}
                          onChange={(e) => {
                            if (e.target.value) handleMove(opp.id, e.target.value as OpportunityStage);
                          }}
                        >
                          <option value="">Move to…</option>
                          {OPPORTUNITY_STAGES.filter((s) => s !== stage).map((s) => (
                            <option key={s} value={s}>
                              {stageLabel(s)}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {lossModalFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <Card className="w-full max-w-sm p-5">
            <h2 className="mb-3 text-sm font-semibold text-primary">Mark as Lost</h2>
            <div className="space-y-3">
              <div>
                <Label htmlFor="pipelineLossReason">Loss reason</Label>
                <Select id="pipelineLossReason" value={lossReason} onChange={(e) => setLossReason(e.target.value)}>
                  {LOSS_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="pipelineLossNote">Note (optional)</Label>
                <input
                  id="pipelineLossNote"
                  className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  value={lossNote}
                  onChange={(e) => setLossNote(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setLossModalFor(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="danger" onClick={confirmLoss} disabled={changeStage.isPending}>
                  {changeStage.isPending ? "Saving…" : "Mark Lost"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
