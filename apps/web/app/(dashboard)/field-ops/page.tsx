"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ClipboardList, ExternalLink } from "lucide-react";
import {
  useFieldDay,
  useSopTemplates,
  useUpdateTaskSop,
  useReturnOriginals,
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

export default function FieldOpsPage() {
  const today = useMemo(() => localDateISO(new Date()), []);
  const [date, setDate] = useState(today);
  const { data: user } = useCurrentUser();
  const { data, isLoading, isError } = useFieldDay({ date, mine: true });
  const { data: templates } = useSopTemplates();
  const updateSop = useUpdateTaskSop();
  const returnOriginals = useReturnOriginals();
  const canAssign = hasPermission(user, "task:update") && user?.role?.key !== "DELIVERY_PERSON";

  const jobs = data?.jobs ?? [];
  const stats = data?.stats;
  const openJobs = jobs.filter((j) => !["DONE"].includes(j.status));

  async function toggleSharedPreDay(key: string, checked: boolean) {
    const targets = openJobs;
    await Promise.all(
      targets.map((job) =>
        updateSop.mutateAsync({
          id: job.id,
          input: { sopChecklist: { preDay: { [key]: checked } } },
        }),
      ),
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
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        eyebrow="Projects & Field Work"
        title="Field Ops"
        description="Your assigned jobs, SOP checklists, document packs, and end-of-day originals return."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 w-[11.5rem] py-2"
              aria-label="Board date"
            />
            <Link href="/team-tasks">
              <Button variant="secondary" size="sm" className="h-10 px-3.5 text-sm">
                <ClipboardList size={15} />
                My jobs
              </Button>
            </Link>
            {canAssign && (
              <Link href="/team-tasks/new">
                <Button size="sm" className="h-10 px-3.5 text-sm">
                  + Assign job
                </Button>
              </Link>
            )}
          </div>
        }
      />

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

      {isLoading && <p className="text-sm text-muted">Loading your jobs…</p>}
      {isError && <p className="text-sm text-red-600">Couldn&apos;t load Field Ops. Try refreshing.</p>}

      {/* Jobs first — primary surface for drivers */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-primary">Your schedule</h2>
            <p className="text-xs text-muted">Open jobs assigned to you, in planned order.</p>
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
              onToggle={async (section, key, checked) => {
                await updateSop.mutateAsync({
                  id: job.id,
                  input: {
                    sopChecklist: { [section]: { [key]: checked } },
                    ...(section === "visit" && key === "customerNotified" && checked
                      ? { customerNotified: true }
                      : {}),
                  },
                });
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
}: {
  job: EngineerTask;
  index: number;
  templates: ReturnType<typeof useSopTemplates>["data"];
  defaultOpen?: boolean;
  onToggle: (section: SopSection, key: string, checked: boolean) => Promise<void>;
  onReturnOriginals: () => Promise<void>;
  returning: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const docs = templates?.docsByJobType?.[job.jobType] ?? templates?.docsByJobType?.OTHER ?? [];
  const needsWarehouse =
    job.jobType === "DELIVERY" || job.jobType === "EXPORT_SHIPMENT" || job.jobType === "IMPORT_RECEIVING";
  const needsVisit =
    job.jobType === "DELIVERY" ||
    job.jobType === "CHEQUE_COLLECTION" ||
    job.jobType === "SITE_VISIT" ||
    job.jobType === "DOCUMENT_PICKUP";

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
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
              onToggle={(key, checked) => onToggle("warehouse", key, checked)}
            />
          )}
          {needsVisit && (
            <ChecklistBlock
              title={SOP_SECTION_LABELS.visit}
              items={templates?.visit ?? []}
              values={job.sopChecklist?.visit}
              onToggle={(key, checked) => onToggle("visit", key, checked)}
            />
          )}
          <ChecklistBlock
            title={`${SOP_SECTION_LABELS.docs} — ${TASK_JOB_LABELS[job.jobType as TaskJobType]}`}
            items={docs}
            values={job.sopChecklist?.docs}
            onToggle={(key, checked) => onToggle("docs", key, checked)}
          />
          <ChecklistBlock
            title={SOP_SECTION_LABELS.eod}
            items={templates?.eod ?? []}
            values={job.sopChecklist?.eod}
            onToggle={(key, checked) => onToggle("eod", key, checked)}
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
}: {
  title: string;
  items: Array<{ key: string; label: string }>;
  values?: Record<string, boolean>;
  onToggle: (key: string, checked: boolean) => void;
}) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.key}>
            <label className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-1 text-sm hover:bg-white/80 dark:hover:bg-slate-800/80">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                checked={!!values?.[item.key]}
                onChange={(e) => onToggle(item.key, e.target.checked)}
              />
              <span className="leading-snug">{item.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
