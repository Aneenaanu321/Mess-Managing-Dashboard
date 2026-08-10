"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Eye, Send, AlertTriangle } from "lucide-react";
import {
  useTask,
  useUpdateTask,
  useAcknowledgeTask,
  useSubmitTask,
  useVerifyTask,
  useUpdateTaskSop,
  useReportIncomplete,
  useReturnOriginals,
  useAssignableUsers,
  useSopTemplates,
  TASK_STATUS_TONE,
  TASK_STATUS_LABELS,
  TASK_JOB_LABELS,
  SOP_SECTION_LABELS,
  TaskJobType,
  PaymentMethod,
  SopSection,
} from "@/lib/tasks";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { FileAttachments } from "@/components/FileAttachments";
import { useConfirm } from "@/components/ConfirmDialog";

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: task, isLoading } = useTask(params.id);
  const { data: user } = useCurrentUser();
  const { data: assignableUsers } = useAssignableUsers();
  const { data: templates } = useSopTemplates();
  const updateTask = useUpdateTask();
  const updateSop = useUpdateTaskSop();
  const acknowledge = useAcknowledgeTask();
  const submitTask = useSubmitTask();
  const verifyTask = useVerifyTask();
  const reportIncomplete = useReportIncomplete();
  const returnOriginals = useReturnOriginals();
  const confirm = useConfirm();

  const [error, setError] = useState<string | null>(null);
  const [completionNote, setCompletionNote] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CHEQUE");
  const [paymentReference, setPaymentReference] = useState("");
  const [verifyNote, setVerifyNote] = useState("");
  const [incompleteReason, setIncompleteReason] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [itemCount, setItemCount] = useState("");
  const [totalPalletWeight, setTotalPalletWeight] = useState("");
  const [packingNotes, setPackingNotes] = useState("");
  const [packItems, setPackItems] = useState<Array<{ name: string; weight: string }>>([{ name: "", weight: "" }]);
  const [packPallets, setPackPallets] = useState<Array<{ label: string; itemNames: string; weight: string }>>([
    { label: "", itemNames: "", weight: "" },
  ]);

  useEffect(() => {
    if (!task) return;
    if (task.packingDetails?.itemCount != null) setItemCount(String(task.packingDetails.itemCount));
    if (task.packingDetails?.totalPalletWeight != null) setTotalPalletWeight(String(task.packingDetails.totalPalletWeight));
    if (task.packingDetails?.notes) setPackingNotes(task.packingDetails.notes);
    if (task.packingDetails?.items?.length) {
      setPackItems(task.packingDetails.items.map((i) => ({ name: i.name, weight: i.weight != null ? String(i.weight) : "" })));
    }
    if (task.packingDetails?.pallets?.length) {
      setPackPallets(
        task.packingDetails.pallets.map((p) => ({
          label: p.label ?? "",
          itemNames: p.itemNames ?? "",
          weight: p.weight != null ? String(p.weight) : "",
        })),
      );
    }
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!task) return <p className="text-sm text-slate-500">Task not found.</p>;

  const canManage = hasPermission(user, "task:update");
  const isAssignee = user?.id === task.assignee?.id;
  const isCreator = user?.id === task.createdBy?.id;
  const isCollection = task.jobType === "CHEQUE_COLLECTION";
  const needsPacking = task.jobType === "DELIVERY" || task.jobType === "EXPORT_SHIPMENT";
  const canAcknowledge = isAssignee && (task.status === "TODO" || task.status === "SEEN" || task.status === "IN_PROGRESS") && !task.seenAt;
  const canStart = isAssignee && task.status === "SEEN";
  const canSubmit = isAssignee && ["TODO", "SEEN", "IN_PROGRESS"].includes(task.status);
  const canVerify = canManage && task.status === "SUBMITTED" && (isCreator || hasPermission(user, "task:update"));
  const canEditSop = canManage && task.status !== "DONE";

  const docsItems = task.requiredDocs ?? templates?.docsByJobType?.[task.jobType] ?? [];

  async function handleAcknowledge() {
    setError(null);
    try {
      await acknowledge.mutateAsync(task!.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as seen");
    }
  }

  async function handleStart() {
    setError(null);
    try {
      await updateTask.mutateAsync({ id: task!.id, input: { status: "IN_PROGRESS" } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start job");
    }
  }

  async function toggleSop(section: SopSection, key: string, checked: boolean) {
    setError(null);
    try {
      await updateSop.mutateAsync({
        id: task!.id,
        input: {
          sopChecklist: { [section]: { [key]: checked } },
          ...(section === "visit" && key === "customerNotified" && checked ? { customerNotified: true } : {}),
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save checklist");
    }
  }

  function buildPackingDetails() {
    const items = packItems
      .filter((i) => i.name.trim())
      .map((i) => ({ name: i.name.trim(), weight: i.weight === "" ? null : Number(i.weight) }));
    const pallets = packPallets
      .filter((p) => p.label.trim() || p.itemNames.trim())
      .map((p) => ({
        label: p.label.trim() || undefined,
        itemNames: p.itemNames.trim() || undefined,
        weight: p.weight === "" ? null : Number(p.weight),
      }));
    return {
      itemCount: itemCount === "" ? undefined : Number(itemCount),
      totalPalletWeight: totalPalletWeight === "" ? null : Number(totalPalletWeight),
      notes: packingNotes || undefined,
      items: items.length ? items : undefined,
      pallets: pallets.length ? pallets : undefined,
    };
  }

  async function savePacking() {
    setError(null);
    try {
      await updateSop.mutateAsync({
        id: task!.id,
        input: { packingDetails: buildPackingDetails() },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save packing");
    }
  }

  async function handleSubmit() {
    if (!completionNote.trim()) {
      setError("Add a completion note before submitting");
      return;
    }
    const ok = await confirm({
      title: "Submit job to coordinator?",
      message: "Document checklist must be complete. Upload scans below. Coordinator will verify and close.",
      confirmLabel: "Submit",
    });
    if (!ok) return;
    setError(null);
    try {
      await submitTask.mutateAsync({
        id: task!.id,
        input: {
          completionNote: completionNote.trim(),
          sopChecklist: task!.sopChecklist,
          packingDetails: needsPacking ? buildPackingDetails() : undefined,
          ...(isCollection || paymentAmount
            ? {
                paymentAmount: Number(paymentAmount || 0),
                paymentMethod,
                paymentReference: paymentReference || undefined,
              }
            : {}),
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    }
  }

  async function handleIncomplete() {
    if (!incompleteReason.trim()) {
      setError("Enter why the job cannot be completed");
      return;
    }
    const ok = await confirm({
      title: "Report job incomplete?",
      message: "Coordinator will be notified so the job can be rescheduled.",
      confirmLabel: "Report incomplete",
    });
    if (!ok) return;
    setError(null);
    try {
      await reportIncomplete.mutateAsync({
        id: task!.id,
        reason: incompleteReason.trim(),
        rescheduleDate: rescheduleDate || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to report");
    }
  }

  async function handleVerify() {
    const ok = await confirm({
      title: "Confirm docs/payment received?",
      message: "This closes the job as done and notifies the delivery person to return originals.",
      confirmLabel: "Verify & close",
    });
    if (!ok) return;
    setError(null);
    try {
      await verifyTask.mutateAsync({ id: task!.id, note: verifyNote || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify");
    }
  }

  async function handleAssigneeChange(assigneeId: string) {
    setError(null);
    try {
      await updateTask.mutateAsync({ id: task!.id, input: { assigneeId: assigneeId || undefined } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reassign");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-400">
            <Link href="/field-ops" className="hover:underline">
              Field Ops
            </Link>
            {task.project && (
              <>
                {" · "}
                <Link href={`/customer-projects/${task.project.id}`} className="hover:underline">
                  {task.project.code}
                </Link>
              </>
            )}
            {" · "}
            {TASK_JOB_LABELS[task.jobType as TaskJobType]}
          </p>
          <h1 className="text-xl font-semibold text-primary">{task.title}</h1>
          {task.createdBy && (
            <p className="mt-1 text-sm text-slate-500">
              Assigned by {task.createdBy.firstName} {task.createdBy.lastName}
            </p>
          )}
        </div>
        <Badge tone={TASK_STATUS_TONE[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>
      )}

      {task.incompleteReason && (
        <Card className="border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <p className="font-medium">Cannot complete as scheduled</p>
          <p>{task.incompleteReason}</p>
          {task.rescheduleDate && <p className="mt-1">Reschedule: {new Date(task.rescheduleDate).toLocaleDateString()}</p>}
        </Card>
      )}

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">Job timeline</h2>
        <ol className="space-y-2 text-sm">
          <Step done label="Assigned" detail={new Date(task.createdAt).toLocaleString()} />
          <Step done={!!task.seenAt} label="Seen by assignee" detail={task.seenAt ? new Date(task.seenAt).toLocaleString() : "Waiting…"} />
          <Step
            done={!!task.customerNotifiedAt}
            label="Customer notified (if visit)"
            detail={task.customerNotifiedAt ? new Date(task.customerNotifiedAt).toLocaleString() : "—"}
          />
          <Step
            done={!!task.submittedAt}
            label="Work done + docs/payment submitted"
            detail={task.submittedAt ? new Date(task.submittedAt).toLocaleString() : "Waiting…"}
          />
          <Step
            done={!!task.verifiedAt || task.status === "DONE"}
            label="Coordinator verified & closed"
            detail={task.verifiedAt ? new Date(task.verifiedAt).toLocaleString() : "Waiting…"}
          />
          <Step
            done={!!task.originalsReturnedAt}
            label="Originals returned to office"
            detail={task.originalsReturnedAt ? new Date(task.originalsReturnedAt).toLocaleString() : "End of day"}
          />
        </ol>
      </Card>

      <Card className="p-5">
        <dl className="space-y-2 text-sm">
          <Row label="Project" value={task.project?.name ?? "—"} />
          <Row label="Customer" value={task.project?.customer?.name ?? "—"} />
          <Row label="Job type" value={TASK_JOB_LABELS[task.jobType as TaskJobType]} />
          <Row
            label="Assignee"
            value={
              canManage && task.status !== "DONE" ? (
                <Select value={task.assignee?.id ?? ""} onChange={(e) => handleAssigneeChange(e.target.value)} className="max-w-xs">
                  <option value="">Unassigned</option>
                  {(assignableUsers ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} — {u.role.name}
                    </option>
                  ))}
                </Select>
              ) : task.assignee ? (
                `${task.assignee.firstName} ${task.assignee.lastName}`
              ) : (
                "Unassigned"
              )
            }
          />
          <Row label="Due" value={task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"} />
          <Row label="Instructions" value={task.description || "—"} />
          {task.completionNote && <Row label="Completion note" value={task.completionNote} />}
          {task.paymentAmount != null && (
            <Row
              label="Collected payment"
              value={`${Number(task.paymentAmount).toLocaleString()} · ${task.paymentMethod ?? "—"} · ${task.paymentReference || "no ref"}`}
            />
          )}
          {task.verifiedBy && (
            <Row label="Verified by" value={`${task.verifiedBy.firstName} ${task.verifiedBy.lastName}`} />
          )}
        </dl>
      </Card>

      {/* SOP checklists */}
      {canEditSop && (
        <Card className="space-y-5 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-primary">Field SOP checklists</h2>
            <Link href="/field-ops" className="text-xs text-brand-700 hover:underline dark:text-brand-400">
              Open Field Ops day board
            </Link>
          </div>

          <ChecklistBlock
            title={SOP_SECTION_LABELS.preDay}
            items={templates?.preDay ?? []}
            values={task.sopChecklist?.preDay}
            onToggle={(key, checked) => toggleSop("preDay", key, checked)}
          />
          <ChecklistBlock
            title={SOP_SECTION_LABELS.warehouse}
            items={templates?.warehouse ?? []}
            values={task.sopChecklist?.warehouse}
            onToggle={(key, checked) => toggleSop("warehouse", key, checked)}
          />
          <ChecklistBlock
            title={SOP_SECTION_LABELS.visit}
            items={templates?.visit ?? []}
            values={task.sopChecklist?.visit}
            onToggle={(key, checked) => toggleSop("visit", key, checked)}
          />
          <ChecklistBlock
            title={`${SOP_SECTION_LABELS.docs} (${TASK_JOB_LABELS[task.jobType as TaskJobType]})`}
            items={docsItems}
            values={task.sopChecklist?.docs}
            onToggle={(key, checked) => toggleSop("docs", key, checked)}
          />
          <ChecklistBlock
            title={SOP_SECTION_LABELS.eod}
            items={templates?.eod ?? []}
            values={task.sopChecklist?.eod}
            onToggle={(key, checked) => toggleSop("eod", key, checked)}
          />

          {needsPacking && (
            <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Packing on Delivery Order</h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      const { openPackingSlipPdf } = await import("@/lib/tasks");
                      await openPackingSlipPdf(task.id);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "PDF failed");
                    }
                  }}
                >
                  Print packing slip PDF
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="itemCount">Number of items packed</Label>
                  <Input id="itemCount" type="number" min={0} value={itemCount} onChange={(e) => setItemCount(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="palletWt">Total pallet weight</Label>
                  <Input
                    id="palletWt"
                    type="number"
                    min={0}
                    value={totalPalletWeight}
                    onChange={(e) => setTotalPalletWeight(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Line items (name + weight)</Label>
                {packItems.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_7rem_auto] gap-2">
                    <Input
                      placeholder="Item name"
                      value={row.name}
                      onChange={(e) =>
                        setPackItems((rows) => rows.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Wt"
                      value={row.weight}
                      onChange={(e) =>
                        setPackItems((rows) => rows.map((r, i) => (i === idx ? { ...r, weight: e.target.value } : r)))
                      }
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setPackItems((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== idx)))}
                    >
                      −
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="secondary" size="sm" onClick={() => setPackItems((rows) => [...rows, { name: "", weight: "" }])}>
                  + Item
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Pallets</Label>
                {packPallets.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-[8rem_1fr_7rem_auto]">
                    <Input
                      placeholder="Pallet #"
                      value={row.label}
                      onChange={(e) =>
                        setPackPallets((rows) => rows.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)))
                      }
                    />
                    <Input
                      placeholder="Contents / item names"
                      value={row.itemNames}
                      onChange={(e) =>
                        setPackPallets((rows) => rows.map((r, i) => (i === idx ? { ...r, itemNames: e.target.value } : r)))
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Wt"
                      value={row.weight}
                      onChange={(e) =>
                        setPackPallets((rows) => rows.map((r, i) => (i === idx ? { ...r, weight: e.target.value } : r)))
                      }
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setPackPallets((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== idx)))}
                    >
                      −
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setPackPallets((rows) => [...rows, { label: "", itemNames: "", weight: "" }])}
                >
                  + Pallet
                </Button>
              </div>
              <div>
                <Label htmlFor="packNotes">Notes</Label>
                <textarea
                  id="packNotes"
                  rows={2}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                  value={packingNotes}
                  onChange={(e) => setPackingNotes(e.target.value)}
                  placeholder="Other packing notes…"
                />
              </div>
              <Button variant="secondary" onClick={savePacking} disabled={updateSop.isPending}>
                Save packing details
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Delivery person actions */}
      {isAssignee && task.status !== "DONE" && task.status !== "SUBMITTED" && (
        <Card className="space-y-4 p-5">
          <h2 className="text-sm font-semibold text-primary">Your actions</h2>
          <div className="flex flex-wrap gap-2">
            {(canAcknowledge || (isAssignee && !task.seenAt && task.status === "TODO")) && (
              <Button onClick={handleAcknowledge} disabled={acknowledge.isPending}>
                <Eye size={16} />
                {acknowledge.isPending ? "Saving…" : "Mark as seen"}
              </Button>
            )}
            {canStart && (
              <Button variant="secondary" onClick={handleStart} disabled={updateTask.isPending}>
                Start job
              </Button>
            )}
          </div>

          {canSubmit && (
            <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-700">
              <p className="text-sm text-slate-500">
                Tick the document submission checklist above, upload clear scans, then submit.
              </p>
              <div>
                <Label htmlFor="note">What did you do?</Label>
                <textarea
                  id="note"
                  rows={3}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="Delivered goods / collected cheque / customer signed…"
                />
              </div>
              {(isCollection || paymentAmount !== "") && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" type="number" min={0} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="method">Method</Label>
                    <Select id="method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank transfer</option>
                      <option value="CARD">Card</option>
                      <option value="ONLINE">Online</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="ref">Cheque / ref no.</Label>
                    <Input id="ref" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
                  </div>
                </div>
              )}
              {!isCollection && (
                <button
                  type="button"
                  className="text-xs text-brand-700 hover:underline dark:text-brand-400"
                  onClick={() => setPaymentAmount(paymentAmount !== "" ? "" : "0")}
                >
                  {paymentAmount !== "" ? "Hide payment fields" : "Add payment / cheque details"}
                </button>
              )}
              <Button onClick={handleSubmit} disabled={submitTask.isPending}>
                <Send size={16} />
                {submitTask.isPending ? "Submitting…" : "Submit to coordinator"}
              </Button>
            </div>
          )}

          {task.status !== "BLOCKED" && (
            <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-700">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                <AlertTriangle size={14} /> If the job cannot be completed
              </h3>
              <div>
                <Label htmlFor="incomplete">Reason</Label>
                <Input
                  id="incomplete"
                  value={incompleteReason}
                  onChange={(e) => setIncompleteReason(e.target.value)}
                  placeholder="Customer closed / stock short / access denied…"
                />
              </div>
              <div>
                <Label htmlFor="reschedule">Suggested reschedule date</Label>
                <Input id="reschedule" type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
              </div>
              <Button variant="secondary" onClick={handleIncomplete} disabled={reportIncomplete.isPending}>
                {reportIncomplete.isPending ? "Reporting…" : "Inform office & mark incomplete"}
              </Button>
            </div>
          )}
        </Card>
      )}

      {task.status === "SUBMITTED" && isAssignee && (
        <Card className="p-4 text-sm text-amber-800 dark:text-amber-300">
          Submitted — waiting for the sales coordinator to confirm docs/payment received.
        </Card>
      )}

      {canVerify && (
        <Card className="space-y-3 p-5">
          <h2 className="text-sm font-semibold text-primary">Coordinator review</h2>
          <p className="text-sm text-slate-500">Confirm you received the documents / cheque, then close the job.</p>
          <div>
            <Label htmlFor="verifyNote">Note (optional)</Label>
            <Input id="verifyNote" value={verifyNote} onChange={(e) => setVerifyNote(e.target.value)} placeholder="Cheque received, deposited…" />
          </div>
          <Button onClick={handleVerify} disabled={verifyTask.isPending}>
            <CheckCircle2 size={16} />
            {verifyTask.isPending ? "Closing…" : "Verify docs received & close job"}
          </Button>
        </Card>
      )}

      {(task.status === "DONE" || task.status === "SUBMITTED") && !task.originalsReturnedAt && canManage && (
        <Card className="space-y-3 p-5">
          <h2 className="text-sm font-semibold text-primary">End of day — return originals</h2>
          <p className="text-sm text-slate-500">Return DOs, checklists, CNs, and other paperwork to the office.</p>
          <Button onClick={() => returnOriginals.mutateAsync(task.id)} disabled={returnOriginals.isPending}>
            {returnOriginals.isPending ? "Saving…" : "Mark originals returned"}
          </Button>
        </Card>
      )}

      <FileAttachments entityType="EngineerTask" entityId={task.id} />
    </div>
  );
}

function ChecklistBlock({
  title,
  items,
  values,
  onToggle,
}: {
  title: string;
  items: Array<{ key: string; label: string }>;
  values?: Record<string, boolean>;
  onToggle: (key: string, checked: boolean) => void;
}) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.key}>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5" checked={!!values?.[item.key]} onChange={(e) => onToggle(item.key, e.target.checked)} />
              <span>{item.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Step({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  return (
    <li className="flex gap-2">
      <span className={done ? "text-emerald-600" : "text-slate-300"}>{done ? "✓" : "○"}</span>
      <div>
        <p className={done ? "font-medium text-primary" : "text-slate-500"}>{label}</p>
        <p className="text-xs text-slate-400">{detail}</p>
      </div>
    </li>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 dark:border-slate-700">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-primary">{value}</dd>
    </div>
  );
}
