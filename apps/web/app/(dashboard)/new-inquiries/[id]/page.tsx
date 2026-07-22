"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useLead,
  useConvertLead,
  useDisqualifyLead,
  useAssignLead,
  useAssignableLeadOwners,
  useUpdateLead,
  DISQUALIFY_REASONS,
  STATUS_TONE,
} from "@/lib/leads";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { useConfirm } from "@/components/ConfirmDialog";

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: lead, isLoading } = useLead(params.id);
  const { data: user } = useCurrentUser();
  const convertLead = useConvertLead();
  const disqualifyLead = useDisqualifyLead();
  const assignLead = useAssignLead();
  const updateLead = useUpdateLead();
  const { data: owners } = useAssignableLeadOwners();
  const confirm = useConfirm();
  const [estimatedValue, setEstimatedValue] = useState("50000");
  const [disqualifyReason, setDisqualifyReason] = useState<string>(DISQUALIFY_REASONS[0]);
  const [ownerId, setOwnerId] = useState("");
  const [internalNotes, setInternalNotes] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!lead) return <p className="text-sm text-slate-500">Lead not found.</p>;

  const notesValue = internalNotes ?? lead.internalNotes ?? "";
  const canAssign = hasPermission(user, "lead:assign");

  async function handleConvert() {
    setError(null);
    try {
      await convertLead.mutateAsync({ id: lead!.id, estimatedValue: Number(estimatedValue) });
      router.push("/new-inquiries");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
    }
  }

  async function handleDisqualify() {
    const ok = await confirm({
      title: "Disqualify lead?",
      message: `${lead!.companyName} will be marked as disqualified and removed from active follow-up.`,
      confirmLabel: "Disqualify",
      variant: "danger",
    });
    if (!ok) return;
    setError(null);
    try {
      await disqualifyLead.mutateAsync({ id: lead!.id, reason: disqualifyReason });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disqualify lead");
    }
  }

  async function handleAssign() {
    if (!ownerId) return;
    setError(null);
    try {
      await assignLead.mutateAsync({ id: lead!.id, ownerId });
      setOwnerId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed");
    }
  }

  async function handleSaveNotes() {
    setError(null);
    try {
      await updateLead.mutateAsync({ id: lead!.id, input: { internalNotes: notesValue } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notes");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{lead.code}</p>
          <h1 className="text-xl font-semibold text-primary">{lead.companyName}</h1>
          <p className="text-sm text-slate-500">{lead.contactName}</p>
        </div>
        <Badge tone={STATUS_TONE[lead.status]}>{lead.status}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Details</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Email" value={lead.email ?? "—"} />
            <Row label="Phone" value={lead.phone ?? "—"} />
            <Row label="Source" value={lead.source.replaceAll("_", " ")} />
            <Row label="Industry" value={lead.industry} />
            <Row label="Owner" value={lead.owner ? `${lead.owner.firstName} ${lead.owner.lastName}` : "Unassigned"} />
            <Row label="AI Lead Score" value={String(lead.score)} />
            <Row
              label="First contact"
              value={lead.firstContactedAt ? new Date(lead.firstContactedAt).toLocaleString() : "Not yet"}
            />
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Convert to Deal</h2>
          {lead.status === "CONVERTED" ? (
            <p className="text-sm text-slate-500">This lead has already been converted.</p>
          ) : lead.status === "DISQUALIFIED" ? (
            <p className="text-sm text-slate-500">Disqualified leads can&apos;t be converted.</p>
          ) : hasPermission(user, "lead:convert") ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="value">Estimated deal value (AED)</Label>
                <Input id="value" type="number" min={0} value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <Button
                onClick={async () => {
                  setConverting(true);
                  await handleConvert();
                  setConverting(false);
                }}
                disabled={converting}
              >
                {converting ? "Converting…" : "Convert to Deal"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">You don&apos;t have permission to convert leads.</p>
          )}
        </Card>

        {canAssign && lead.status !== "CONVERTED" && lead.status !== "DISQUALIFIED" && (
          <Card className="col-span-2 p-5">
            <h2 className="mb-3 text-sm font-semibold text-primary">Assign owner</h2>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <Label htmlFor="owner">Sales executive</Label>
                <Select id="owner" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                  <option value="">Select owner…</option>
                  {(owners ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.firstName} {o.lastName} ({o.role.name})
                    </option>
                  ))}
                </Select>
              </div>
              <Button onClick={handleAssign} disabled={!ownerId || assignLead.isPending}>
                {assignLead.isPending ? "Assigning…" : "Assign"}
              </Button>
            </div>
          </Card>
        )}

        {hasPermission(user, "lead:update") && (
          <Card className="col-span-2 p-5">
            <h2 className="mb-1 text-sm font-semibold text-primary">Internal notes</h2>
            <p className="mb-3 text-xs text-slate-500">Coordinator-only — not shown on customer exports.</p>
            <textarea
              value={notesValue}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-primary dark:border-slate-700 dark:bg-slate-900"
              placeholder="Handover context, preferences, blockers…"
            />
            <div className="mt-2">
              <Button size="sm" variant="secondary" onClick={handleSaveNotes} disabled={updateLead.isPending}>
                {updateLead.isPending ? "Saving…" : "Save notes"}
              </Button>
            </div>
          </Card>
        )}

        {lead.status !== "CONVERTED" && lead.status !== "DISQUALIFIED" && hasPermission(user, "lead:update") && (
          <Card className="col-span-2 p-5">
            <h2 className="mb-3 text-sm font-semibold text-primary">Disqualify Lead</h2>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <Label htmlFor="reason">Reason</Label>
                <Select id="reason" value={disqualifyReason} onChange={(e) => setDisqualifyReason(e.target.value)}>
                  {DISQUALIFY_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              </div>
              <Button variant="danger" onClick={handleDisqualify} disabled={disqualifyLead.isPending}>
                {disqualifyLead.isPending ? "Disqualifying…" : "Disqualify"}
              </Button>
            </div>
          </Card>
        )}
      </div>

      <div className="mt-4">
        <ActivityTimeline scope={{ leadId: lead.id }} />
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
