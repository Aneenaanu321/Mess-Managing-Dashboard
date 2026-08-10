"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, ClipboardList, ExternalLink, MapPin, PackageCheck } from "lucide-react";
import {
  useFieldDay,
  useSopTemplates,
  useUpdateTaskSop,
  useReturnOriginals,
  useReturnOriginalsForDay,
  useReorderFieldDay,
  TASK_JOB_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUS_TONE,
  SOP_SECTION_LABELS,
  EngineerTask,
  SopSection,
  TaskJobType,
} from "@/lib/tasks";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Card, Input } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { FieldOpsSopGuide } from "@/components/FieldOpsSopGuide";
import { useFiles } from "@/lib/files";
import { toast } from "@/lib/toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { useT } from "@/lib/i18n";
import { enqueueMutation, flushQueuedMutations, isProbablyOffline, listQueuedMutations } from "@/lib/offline-queue";
import { apiClient } from "@/lib/api-client";
import { mapsUrl } from "@/lib/customers";

export default function FieldOpsPage() {
  const t = useT();
  const today = useMemo(() => localDateISO(new Date()), []);
  const [date, setDate] = useState(today);
  const { data: user } = useCurrentUser();
  const { data, isLoading, isError, refetch } = useFieldDay({ date, mine: true });
  const { data: templates } = useSopTemplates();
  const updateSop = useUpdateTaskSop();
  const returnOriginals = useReturnOriginals();
  const returnOriginalsDay = useReturnOriginalsForDay();
  const reorderDay = useReorderFieldDay();
  const confirm = useConfirm();
  const canAssign = hasPermission(user, "task:update") && user?.role?.key !== "DELIVERY_PERSON";
  const [pendingSync, setPendingSync] = useState(0);

  const jobs = data?.jobs ?? [];
  const stats = data?.stats;
  const openJobs = jobs.filter((j) => !["DONE"].includes(j.status));
  const originalsDue = jobs.filter((j) => j.status === "DONE" && !j.originalsReturnedAt);

  useEffect(() => {
    async function refreshQueue() {
      try {
        setPendingSync((await listQueuedMutations()).length);
      } catch {
        setPendingSync(0);
      }
    }
    async function flush() {
      try {
        const n = await flushQueuedMutations(async (method, path, body) => {
          if (method === "PATCH") await apiClient.patch(path, body);
          else await apiClient.post(path, body);
        });
        if (n > 0) {
          toast.success(`Synced ${n} offline change${n === 1 ? "" : "s"}`);
          await refetch();
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Offline sync failed");
      } finally {
        await refreshQueue();
      }
    }
    void refreshQueue();
    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [refetch]);

  async function patchSop(jobId: string, input: Parameters<typeof updateSop.mutateAsync>[0]["input"], label: string) {
    if (isProbablyOffline()) {
      await enqueueMutation({
        method: "PATCH",
        path: `/tasks/${jobId}/sop`,
        body: input,
        label,
      });
      setPendingSync((await listQueuedMutations()).length);
      toast.success("Saved offline — will sync when online");
      return;
    }
    await updateSop.mutateAsync({ id: jobId, input });
  }

  async function handleReturnAllOriginals() {
    if (originalsDue.length === 0) {
      toast.error("No done jobs waiting on originals for this day");
      return;
    }
    const ok = await confirm({
      title: "Return originals for the day?",
      message: `Mark originals returned for ${originalsDue.length} done job${originalsDue.length === 1 ? "" : "s"} on this board. Coordinators will be notified.`,
      confirmLabel: "Return all originals",
    });
    if (!ok) return;
    try {
      await returnOriginalsDay.mutateAsync({ date, mine: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to return originals");
    }
  }

  async function moveJob(jobId: string, direction: -1 | 1) {
    const ids = jobs.map((j) => j.id);
    const idx = ids.indexOf(jobId);
    const swap = idx + direction;
    if (idx < 0 || swap < 0 || swap >= ids.length) return;
    const next = [...ids];
    const a = next[idx]!;
    next[idx] = next[swap]!;
    next[swap] = a;
    try {
      await reorderDay.mutateAsync({ date, orderedIds: next });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder");
    }
  }

  async function toggleSharedPreDay(key: string, checked: boolean) {
    const targets = openJobs;
    await Promise.all(
      targets.map((job) => patchSop(job.id, { sopChecklist: { preDay: { [key]: checked } } }, `preDay:${key}`)),
    );
  }

  const preDayAggregate = useMemo(() => {
    if (!templates || openJobs.length === 0) return {};
    const agg: Record<string, boolean> = {};
    for (const item of templates.preDay) {
      agg[item.key] = openJobs.every((j) => j.sopChecklist?.preDay?.[item.key]);
    }
    return agg;
  }, [templates, openJobs]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Projects & Field Work"
        title={t("fieldOps.title")}
        description={t("fieldOps.description")}
        actions={
          <div className="flex flex-nowrap items-center gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="!h-10 !w-[11.5rem] shrink-0 py-2"
              aria-label="Board date"
            />
            <Link href="/team-tasks" className="shrink-0">
              <Button variant="secondary" size="sm" className="h-10 px-3.5 text-sm">
                <ClipboardList size={15} />
                My jobs
              </Button>
            </Link>
            {canAssign && (
              <Link href="/team-tasks/new" className="shrink-0">
                <Button size="sm" className="h-10 px-3.5 text-sm">
                  + Assign job
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {pendingSync > 0 && (
        <Card className="border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          {t("fieldOps.pendingSync")}: {pendingSync}
        </Card>
      )}

      <FieldOpsSopGuide />

      {stats && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <Stat label="Assigned" value={stats.total} />
          <Stat label="Open" value={stats.open} />
          <Stat label="Awaiting verify" value={stats.submitted} />
          <Stat label="Done" value={stats.done} />
          <Stat label="Incomplete" value={stats.blocked} />
          <Stat label="Originals due" value={stats.originalsPending} />
        </div>
      )}

      {!isLoading && (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-primary">{t("fieldOps.eod")}</h2>
            <p className="mt-0.5 text-xs text-muted">
              {originalsDue.length === 0
                ? "No done jobs waiting on paperwork return for this board."
                : `Return DOs, checklists, and other originals for ${originalsDue.length} done job${originalsDue.length === 1 ? "" : "s"} in one tap.`}
            </p>
          </div>
          <Button
            onClick={handleReturnAllOriginals}
            disabled={returnOriginalsDay.isPending || originalsDue.length === 0}
            className="shrink-0"
          >
            <PackageCheck size={16} />
            {returnOriginalsDay.isPending
              ? "Saving…"
              : originalsDue.length === 0
                ? "All originals returned"
                : `${t("fieldOps.returnAll")} (${originalsDue.length})`}
          </Button>
        </Card>
      )}

      {isLoading && <p className="text-sm text-muted">{t("common.loading")}</p>}
      {isError && <p className="text-sm text-red-600">Couldn&apos;t load Field Ops. Try refreshing.</p>}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-primary">{t("fieldOps.schedule")}</h2>
            <p className="text-xs text-muted">{t("fieldOps.reorder")} — use arrows to set visit sequence.</p>
          </div>
          <p className="text-xs text-muted">
            {openJobs.length} open · {jobs.length} total
          </p>
        </div>

        {!isLoading && jobs.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted">
              No jobs assigned to you yet. Ask the coordinator to assign a Team Task to you.
            </p>
            <Link href="/team-tasks" className="mt-3 inline-block text-sm text-brand-700 hover:underline dark:text-brand-400">
              Open Team Tasks
            </Link>
          </Card>
        )}

        <div className="space-y-3">
          {jobs.map((job, idx) => (
            <JobCard
              key={job.id}
              job={job}
              index={idx + 1}
              templates={templates}
              defaultOpen={idx === 0 && job.status !== "DONE"}
              canReorder={jobs.length > 1}
              onMoveUp={() => moveJob(job.id, -1)}
              onMoveDown={() => moveJob(job.id, 1)}
              reordering={reorderDay.isPending}
              onToggle={async (section, key, checked) => {
                try {
                  await patchSop(
                    job.id,
                    {
                      sopChecklist: { [section]: { [key]: checked } },
                      ...(section === "visit" && key === "customerNotified" && checked
                        ? { customerNotified: true }
                        : {}),
                    },
                    `${section}.${key}`,
                  );
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to save checklist");
                }
              }}
              onReturnOriginals={async () => {
                await returnOriginals.mutateAsync(job.id);
              }}
              returning={returnOriginals.isPending}
            />
          ))}
        </div>
      </section>

      {/* Pre-day bag checklist */}
      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold text-primary">{SOP_SECTION_LABELS.preDay}</h2>
        <p className="mb-3 text-xs text-muted">Shared across your open jobs for this board.</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {(templates?.preDay ?? []).map((item) => (
            <li key={item.key}>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={!!preDayAggregate[item.key]}
                  disabled={updateSop.isPending || openJobs.length === 0}
                  onChange={(e) => toggleSharedPreDay(item.key, e.target.checked)}
                />
                <span className="leading-snug text-primary">{item.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function localDateISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-primary">{value}</p>
    </Card>
  );
}

function JobCard({
  job,
  index,
  templates,
  defaultOpen,
  onToggle,
  onReturnOriginals,
  returning,
  canReorder,
  onMoveUp,
  onMoveDown,
  reordering,
}: {
  job: EngineerTask;
  index: number;
  templates: ReturnType<typeof useSopTemplates>["data"];
  defaultOpen?: boolean;
  onToggle: (section: SopSection, key: string, checked: boolean) => Promise<void>;
  onReturnOriginals: () => Promise<void>;
  returning: boolean;
  canReorder?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  reordering?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const { data: attachments } = useFiles("EngineerTask", open ? job.id : "");
  const attachmentCount = attachments?.length ?? 0;
  const docs = templates?.docsByJobType?.[job.jobType] ?? templates?.docsByJobType?.OTHER ?? [];
  const needsWarehouse =
    job.jobType === "DELIVERY" || job.jobType === "EXPORT_SHIPMENT" || job.jobType === "IMPORT_RECEIVING";
  const needsVisit =
    job.jobType === "DELIVERY" ||
    job.jobType === "CHEQUE_COLLECTION" ||
    job.jobType === "SITE_VISIT" ||
    job.jobType === "DOCUMENT_PICKUP";
  const site = job.project?.site;
  const hasGeo = site?.geoLat != null && site?.geoLng != null;

  async function handleToggle(section: SopSection, key: string, checked: boolean) {
    if (checked && section === "docs") {
      const item = docs.find((i) => i.key === key);
      if (item?.requiresEvidence) {
        const currentlyChecked = docs.filter(
          (i) => i.requiresEvidence && (i.key === key || job.sopChecklist?.docs?.[i.key]),
        ).length;
        if (attachmentCount < currentlyChecked) {
          toast.error(
            `Upload evidence on the job page first. "${item.label}" needs a file — one attachment per evidence tick.`,
          );
          return;
        }
      }
    }
    await onToggle(section, key, checked);
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted">
            #{job.scheduleOrder ?? index} · {TASK_JOB_LABELS[job.jobType as TaskJobType]}
            {job.dueDate ? ` · Due ${new Date(job.dueDate).toLocaleDateString()}` : " · No due date"}
          </p>
          <Link
            href={`/team-tasks/${job.id}`}
            className="mt-0.5 block truncate text-base font-semibold text-brand-700 hover:underline dark:text-brand-400"
          >
            {job.title}
          </Link>
          <p className="mt-0.5 truncate text-sm text-muted">
            {job.project ? `${job.project.code} · ${job.project.customer?.name ?? job.project.name}` : "No project linked"}
            {site?.label ? ` · ${site.label}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canReorder && (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={onMoveUp} disabled={reordering || index <= 1} aria-label="Move earlier">
                <ArrowUp size={14} />
              </Button>
              <Button variant="ghost" size="sm" onClick={onMoveDown} disabled={reordering} aria-label="Move later">
                <ArrowDown size={14} />
              </Button>
            </div>
          )}
          {hasGeo && (
            <a href={mapsUrl(site!.geoLat!, site!.geoLng!)} target="_blank" rel="noreferrer">
              <Button variant="secondary" size="sm">
                <MapPin size={14} />
                Maps
              </Button>
            </a>
          )}
          <Badge tone={TASK_STATUS_TONE[job.status]}>{TASK_STATUS_LABELS[job.status]}</Badge>
          <Link href={`/team-tasks/${job.id}`}>
            <Button variant="secondary" size="sm">
              <ExternalLink size={14} />
              Open
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            SOP
          </Button>
        </div>
      </div>

      {job.incompleteReason && (
        <p className="mx-4 mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300 sm:mx-5">
          Incomplete: {job.incompleteReason}
          {job.rescheduleDate ? ` · Reschedule ${new Date(job.rescheduleDate).toLocaleDateString()}` : ""}
        </p>
      )}

      {job.sopProgress && (
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-4 py-3 dark:border-slate-700 sm:px-5">
          {(Object.keys(SOP_SECTION_LABELS) as SopSection[]).map((section) => {
            const p = job.sopProgress![section];
            if (!p || p.total === 0) return null;
            return (
              <span
                key={section}
                className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                  p.complete
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {p.complete ? "✓" : "○"} {SOP_SECTION_LABELS[section]} {p.done}/{p.total}
              </span>
            );
          })}
        </div>
      )}

      {open && (
        <div className="space-y-4 border-t border-slate-100 bg-slate-50/70 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/40 sm:px-5">
          {needsWarehouse && (
            <ChecklistBlock
              title={SOP_SECTION_LABELS.warehouse}
              items={templates?.warehouse ?? []}
              values={job.sopChecklist?.warehouse}
              onToggle={(key, checked) => handleToggle("warehouse", key, checked)}
            />
          )}
          {needsVisit && (
            <ChecklistBlock
              title={SOP_SECTION_LABELS.visit}
              items={templates?.visit ?? []}
              values={job.sopChecklist?.visit}
              onToggle={(key, checked) => handleToggle("visit", key, checked)}
            />
          )}
          <ChecklistBlock
            title={`${SOP_SECTION_LABELS.docs} — ${TASK_JOB_LABELS[job.jobType as TaskJobType]}`}
            items={docs}
            values={job.sopChecklist?.docs}
            attachmentCount={attachmentCount}
            onToggle={(key, checked) => handleToggle("docs", key, checked)}
          />
          <ChecklistBlock
            title={SOP_SECTION_LABELS.eod}
            items={templates?.eod ?? []}
            values={job.sopChecklist?.eod}
            onToggle={(key, checked) => handleToggle("eod", key, checked)}
          />
          {(job.status === "DONE" || job.status === "SUBMITTED") && !job.originalsReturnedAt && (
            <Button onClick={onReturnOriginals} disabled={returning} size="sm">
              {returning ? "Saving…" : "Mark originals returned to office"}
            </Button>
          )}
          {job.originalsReturnedAt && (
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Originals returned {new Date(job.originalsReturnedAt).toLocaleString()}
            </p>
          )}
          {docs.some((d) => d.requiresEvidence) && (
            <p className="text-xs text-muted">
              Evidence ticks need attachments —{" "}
              <Link href={`/team-tasks/${job.id}`} className="text-brand-700 hover:underline dark:text-brand-400">
                upload on the job page
              </Link>
              {attachmentCount > 0 ? ` (${attachmentCount} on file)` : ""}.
            </p>
          )}
        </div>
      )}
    </Card>
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
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => {
          const needsFile = Boolean(item.requiresEvidence);
          const checked = !!values?.[item.key];
          const wouldNeed = needsFile && !checked ? evidenceChecked + 1 : evidenceChecked;
          const blocked = needsFile && !checked && attachmentCount < wouldNeed;
          return (
            <li key={item.key}>
              <label
                className={`flex items-start gap-2 rounded-lg px-1 py-1 text-sm ${
                  blocked ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-white/80 dark:hover:bg-slate-800/80"
                }`}
                title={blocked ? "Upload an attachment on the job page first" : undefined}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={checked}
                  disabled={blocked}
                  onChange={(e) => onToggle(item.key, e.target.checked)}
                />
                <span className="leading-snug">
                  {item.label}
                  {needsFile && (
                    <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
                      File
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
