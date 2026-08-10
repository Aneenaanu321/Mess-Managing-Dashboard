"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Eye, Send, AlertTriangle, Trash2 } from "lucide-react";
import {
  useTask,
  useUpdateTask,
  useDeleteTask,
  useAcknowledgeTask,
  useSubmitTask,
  useVerifyTask,
  useUpdateTaskSop,
  useReportIncomplete,
  useReturnOriginals,
  useTaskSignOff,
  useAssignableUsers,
  useTaskLinkOptions,
  useSopTemplates,
  TASK_STATUS_TONE,
  TASK_STATUS_LABELS,
  TASK_JOB_LABELS,
  TASK_JOB_TYPES,
  SOP_SECTION_LABELS,
  TaskJobType,
  PaymentMethod,
  SopSection,
} from "@/lib/tasks";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { FileAttachments } from "@/components/FileAttachments";
import { SignaturePad } from "@/components/SignaturePad";
import { useFiles } from "@/lib/files";
import { useWarehouses } from "@/lib/warehouse";
import { useConfirm } from "@/components/ConfirmDialog";

function toLocalDateInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: task, isLoading } = useTask(params.id);
  const { data: user } = useCurrentUser();
  const { data: assignableUsers } = useAssignableUsers();
  const { data: linkOptions } = useTaskLinkOptions();
  const { data: templates } = useSopTemplates();
  const { data: attachments } = useFiles("EngineerTask", params.id);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const updateSop = useUpdateTaskSop();
  const acknowledge = useAcknowledgeTask();
  const submitTask = useSubmitTask();
  const verifyTask = useVerifyTask();
  const reportIncomplete = useReportIncomplete();
  const returnOriginals = useReturnOriginals();
  const signOff = useTaskSignOff();
  const { data: warehouses } = useWarehouses();
  const confirm = useConfirm();
  const [reserveWarehouseId, setReserveWarehouseId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [completionNote, setCompletionNote] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CHEQUE");
  const [paymentReference, setPaymentReference] = useState("");
  const [verifyNote, setVerifyNote] = useState("");
  const [incompleteReason, setIncompleteReason] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [itemCount, setItemCount] = useState("");
  const [packingNotes, setPackingNotes] = useState("");
  const [packItems, setPackItems] = useState<Array<{ name: string; weight: string }>>([{ name: "", weight: "" }]);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueAt, setEditDueAt] = useState("");
  const [editJobType, setEditJobType] = useState<TaskJobType>("DELIVERY");
  const [editSalesOrderId, setEditSalesOrderId] = useState("");
  const [editCustomerPoId, setEditCustomerPoId] = useState("");
  const [editInvoiceId, setEditInvoiceId] = useState("");

  useEffect(() => {
    if (!task) return;
    if (task.packingDetails?.itemCount != null) setItemCount(String(task.packingDetails.itemCount));
    if (task.packingDetails?.notes) setPackingNotes(task.packingDetails.notes);
    if (task.packingDetails?.items?.length) {
      setPackItems(task.packingDetails.items.map((i) => ({ name: i.name, weight: i.weight != null ? String(i.weight) : "" })));
    }
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditDueAt(toLocalDateInput(task.dueDate));
    setEditJobType(task.jobType as TaskJobType);
    setEditSalesOrderId(task.salesOrder?.id ?? task.salesOrderId ?? "");
    setEditCustomerPoId(task.customerPo?.id ?? task.customerPoId ?? "");
    setEditInvoiceId(task.invoice?.id ?? task.invoiceId ?? "");
    if (task.paymentAmount != null && paymentAmount === "") setPaymentAmount(String(Number(task.paymentAmount)));
  }, [task?.id, task?.title, task?.description, task?.dueDate, task?.jobType, task?.packingDetails, task?.salesOrder, task?.customerPo, task?.invoice, task?.paymentAmount]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!task) return <p className="text-sm text-slate-500">Task not found.</p>;

  const canManage = hasPermission(user, "task:update");
  const isDriver = user?.role?.key === "DELIVERY_PERSON";
  const isAssignee = user?.id === task.assignee?.id;
  const isCreator = user?.id === task.createdBy?.id;
  const isCollection = task.jobType === "CHEQUE_COLLECTION";
  const needsPacking = task.jobType === "DELIVERY" || task.jobType === "EXPORT_SHIPMENT";
  const canAcknowledge = isAssignee && (task.status === "TODO" || task.status === "SEEN" || task.status === "IN_PROGRESS") && !task.seenAt;
  const canStart = isAssignee && task.status === "SEEN";
  const canSubmit = isAssignee && ["TODO", "SEEN", "IN_PROGRESS"].includes(task.status);
  const canVerify = canManage && !isDriver && task.status === "SUBMITTED" && (isCreator || hasPermission(user, "task:update"));
  const canEditSop = (canManage || isAssignee) && task.status !== "DONE";
  const canEditDetails = canManage && !isDriver && task.status !== "DONE";
  const canDelete = canManage && !isDriver;
  const canReassign = canManage && !isDriver && task.status !== "DONE";

  const docsItems = task.requiredDocs ?? templates?.docsByJobType?.[task.jobType] ?? [];
  const attachmentCount = attachments?.length ?? 0;

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await updateTask.mutateAsync({
        id: task!.id,
        input: {
          title: editTitle.trim(),
          description: editDescription.trim() || undefined,
          dueAt: editDueAt || undefined,
          jobType: editJobType,
          salesOrderId: editSalesOrderId || null,
          customerPoId: editCustomerPoId || null,
          invoiceId: editInvoiceId || null,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save job details");
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Delete this job?",
      message: `"${task!.title}" will be permanently removed. The assignee will be notified by email.`,
      confirmLabel: "Delete job",
      variant: "danger",
    });
    if (!ok) return;
    setError(null);
    try {
      await deleteTask.mutateAsync(task!.id);
      router.push("/team-tasks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete job");
    }
  }

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
    if (checked && section === "docs") {
      const item = docsItems.find((i) => i.key === key);
      if (item?.requiresEvidence) {
        const currentlyChecked = docsItems.filter(
          (i) => i.requiresEvidence && (i.key === key || task!.sopChecklist?.docs?.[i.key]),
        ).length;
        if (attachmentCount < currentlyChecked) {
          setError(
            `Upload evidence first (Attachments below). "${item.label}" needs a file — one attachment per evidence tick.`,
          );
          return;
        }
      }
    }
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
    return {
      itemCount: itemCount === "" ? undefined : Number(itemCount),
      notes: packingNotes || undefined,
      items: items.length ? items : undefined,
      pallets: [],
      totalPalletWeight: null,
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
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
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
            <p className="mt-0.5 text-sm text-slate-500">
              Assigned by {task.createdBy.firstName} {task.createdBy.lastName}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={TASK_STATUS_TONE[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
          {canDelete && (
            <Button type="button" variant="danger" size="sm" onClick={handleDelete} disabled={deleteTask.isPending}>
              <Trash2 size={14} />
              {deleteTask.isPending ? "Deleting…" : "Delete job"}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>
      )}

      {canEditDetails && (
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold text-primary">Edit job details</h2>
          <form onSubmit={handleSaveDetails} className="space-y-2">
            <div>
              <Label htmlFor="editTitle">Title</Label>
              <Input id="editTitle" required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="editJobType">Job type</Label>
              <Select
                id="editJobType"
                value={editJobType}
                onChange={(e) => setEditJobType(e.target.value as TaskJobType)}
              >
                {TASK_JOB_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TASK_JOB_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="editDueAt">Due date</Label>
              <Input id="editDueAt" type="date" value={editDueAt} onChange={(e) => setEditDueAt(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="editSalesOrderId">Sales order</Label>
              <Select id="editSalesOrderId" value={editSalesOrderId} onChange={(e) => setEditSalesOrderId(e.target.value)}>
                <option value="">None</option>
                {(linkOptions?.salesOrders ?? []).map((so) => (
                  <option key={so.id} value={so.id}>
                    {so.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="editCustomerPoId">Customer PO</Label>
              <Select id="editCustomerPoId" value={editCustomerPoId} onChange={(e) => setEditCustomerPoId(e.target.value)}>
                <option value="">None</option>
                {(linkOptions?.customerPos ?? []).map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="editInvoiceId">Invoice</Label>
              <Select id="editInvoiceId" value={editInvoiceId} onChange={(e) => setEditInvoiceId(e.target.value)}>
                <option value="">None</option>
                {(linkOptions?.invoices ?? []).map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="editDescription">Instructions</Label>
              <textarea
                id="editDescription"
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-primary shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Address, contact, access notes…"
              />
            </div>
            <Button type="submit" size="sm" disabled={updateTask.isPending || !editTitle.trim()}>
              {updateTask.isPending ? "Saving…" : "Save details"}
            </Button>
          </form>
        </Card>
      )}

      {task.incompleteReason && (
        <Card className="border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <p className="font-medium">Cannot complete as scheduled</p>
          <p>{task.incompleteReason}</p>
          {task.rescheduleDate && <p className="mt-1">Reschedule: {new Date(task.rescheduleDate).toLocaleDateString()}</p>}
        </Card>
      )}

      <Card className="p-4">
        <h2 className="mb-2 text-sm font-semibold text-primary">Job timeline</h2>
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

      <Card className="p-4">
        <dl className="space-y-1.5 text-sm">
          <Row label="Project" value={task.project?.name ?? "—"} />
          <Row
            label="Customer"
            value={
              task.salesOrder?.customer?.name ??
              task.customerPo?.customer?.name ??
              task.invoice?.customer?.name ??
              task.project?.customer?.name ??
              "—"
            }
          />
          <Row
            label="Sales order"
            value={
              task.salesOrder ? (
                <Link href={`/orders/${task.salesOrder.id}`} className="text-brand-600 hover:underline dark:text-brand-400">
                  {task.salesOrder.code}
                </Link>
              ) : (
                "—"
              )
            }
          />
          <Row
            label="Customer PO"
            value={
              task.customerPo ? (
                <Link href={`/customer-orders/${task.customerPo.id}`} className="text-brand-600 hover:underline dark:text-brand-400">
                  {task.customerPo.code}
                  {task.customerPo.poNumber ? ` / ${task.customerPo.poNumber}` : ""}
                </Link>
              ) : (
                "—"
              )
            }
          />
          <Row
            label="Invoice"
            value={
              task.invoice ? (
                <Link href={`/invoices-payments/${task.invoice.id}`} className="text-brand-600 hover:underline dark:text-brand-400">
                  {task.invoice.code}
                </Link>
              ) : (
                "—"
              )
            }
          />
          <Row label="Job type" value={TASK_JOB_LABELS[task.jobType as TaskJobType]} />
          <Row
            label="Assignee"
            value={
              canReassign ? (
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
        <Card className="space-y-4 p-4">
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
            attachmentCount={attachmentCount}
            onToggle={(key, checked) => toggleSop("docs", key, checked)}
          />
          <ChecklistBlock
            title={SOP_SECTION_LABELS.eod}
            items={templates?.eod ?? []}
            values={task.sopChecklist?.eod}
            onToggle={(key, checked) => toggleSop("eod", key, checked)}
          />

          {needsPacking && (
            <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-700">
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
        <Card className="space-y-3 p-4">
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
            <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-700">
              <p className="text-sm text-slate-500">
                Tick the document checklist above (evidence items need uploads), attach clear scans below, then submit.
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
              <div className="flex flex-wrap items-center gap-4">
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
            </div>
          )}

          {task.status !== "BLOCKED" && (
            <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-700">
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
        <Card className="space-y-2 p-4">
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
        <Card className="space-y-2 p-4">
          <h2 className="text-sm font-semibold text-primary">End of day — return originals</h2>
          <p className="text-sm text-slate-500">Return DOs, checklists, CNs, and other paperwork to the office.</p>
          <Button onClick={() => returnOriginals.mutateAsync(task.id)} disabled={returnOriginals.isPending}>
            {returnOriginals.isPending ? "Saving…" : "Mark originals returned"}
          </Button>
        </Card>
      )}

      <FileAttachments
        entityType="EngineerTask"
        entityId={task.id}
        hint="Evidence checklist items (signed DO, damages, scans shared, etc.) need one attachment each before they can be ticked."
      />

      {canEditSop && (task.salesOrder?.id || task.salesOrderId) && (
        <Card className="space-y-3 p-5">
          <h2 className="text-sm font-semibold text-primary">Warehouse stock reservation</h2>
          <p className="text-xs text-slate-500">
            Reserve available inventory against the linked sales order (same allocate flow as Order Completed). Marks
            warehouse checklist items complete when successful.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[12rem] flex-1">
              <Label htmlFor="reserveWh">Warehouse</Label>
              <Select
                id="reserveWh"
                value={reserveWarehouseId}
                onChange={(e) => setReserveWarehouseId(e.target.value)}
              >
                <option value="">Default (first warehouse)</option>
                {(warehouses ?? []).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              onClick={async () => {
                setError(null);
                try {
                  await updateSop.mutateAsync({
                    id: task.id,
                    input: {
                      reserveStock: true,
                      ...(reserveWarehouseId ? { warehouseId: reserveWarehouseId } : {}),
                      sopChecklist: {
                        warehouse: { soChecklistMarked: true, soChecklistComplete: true },
                      },
                    },
                  });
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to reserve stock");
                }
              }}
              disabled={updateSop.isPending}
            >
              {updateSop.isPending ? "Reserving…" : "Reserve stock for this job"}
            </Button>
          </div>
        </Card>
      )}

      {canEditSop && task.status !== "DONE" && (
        <Card className="space-y-3 p-5">
          <h2 className="text-sm font-semibold text-primary">Digital customer sign-off</h2>
          {task.customerSignOff ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Signed by {task.customerSignOff.name} ({task.customerSignOff.document}) via {task.customerSignOff.source}{" "}
              · {new Date(task.customerSignOff.signedAt).toLocaleString()}
            </p>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                Capture a signature on-site, or ask the customer to sign in the portal (Sign-off).
              </p>
              <SignaturePad
                pending={signOff.isPending}
                onSubmit={async (payload) => {
                  setError(null);
                  await signOff.mutateAsync({ id: task.id, input: payload });
                }}
              />
            </>
          )}
        </Card>
      )}
    </div>
  );
}

function ChecklistBlock({
  title,
  items,
  values,
  onToggle,
  attachmentCount = 0,
}: {
  title: string;
  items: Array<{ key: string; label: string; requiresEvidence?: boolean }>;
  values?: Record<string, boolean>;
  onToggle: (key: string, checked: boolean) => void;
  attachmentCount?: number;
}) {
  if (!items.length) return null;
  const evidenceChecked = items.filter((i) => i.requiresEvidence && values?.[i.key]).length;
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((item) => {
          const needsFile = Boolean(item.requiresEvidence);
          const checked = !!values?.[item.key];
          const wouldNeed = needsFile && !checked ? evidenceChecked + 1 : evidenceChecked;
          const blocked = needsFile && !checked && attachmentCount < wouldNeed;
          return (
            <li key={item.key}>
              <label
                className={`flex items-start gap-2 text-sm ${blocked ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                title={blocked ? "Upload an attachment first — one file per evidence tick" : undefined}
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={checked}
                  disabled={blocked}
                  onChange={(e) => onToggle(item.key, e.target.checked)}
                />
                <span>
                  {item.label}
                  {needsFile && (
                    <span className="ml-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                      Attachment required
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
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
    <div className="flex justify-between gap-3 border-b border-slate-100 pb-1.5 dark:border-slate-700">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-primary">{value}</dd>
    </div>
  );
}
