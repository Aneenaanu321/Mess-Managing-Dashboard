"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import {
  useAssignableUsers,
  useSopCompliance,
  TASK_JOB_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUS_TONE,
  TASK_JOB_TYPES,
  SopComplianceIssue,
  SopComplianceJob,
} from "@/lib/tasks";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { BranchSwitcher } from "@/components/BranchSwitcher";

function localDateISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function Tile({
  label,
  value,
  suffix,
  tone = "slate",
  active,
  onClick,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  tone?: "slate" | "amber" | "red" | "green" | "blue";
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        active ? "border-brand-400 ring-2 ring-brand-200 dark:ring-brand-800" : "border-slate-200 hover:border-brand-300 dark:border-slate-700"
      } bg-surface`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-primary">
        {value}
        {suffix ? <span className="ml-1 text-sm font-medium text-muted">{suffix}</span> : null}
      </p>
      {tone !== "slate" && Number(value) > 0 && (
        <Badge tone={tone} className="mt-2">
          Needs attention
        </Badge>
      )}
    </button>
  );
}

function IssueBadges({ job }: { job: SopComplianceJob }) {
  return (
    <div className="flex flex-wrap gap-1">
      {job.issues.missingScans && <Badge tone="red">Missing scans</Badge>}
      {job.issues.incompleteChecklist && <Badge tone="amber">Incomplete checklist</Badge>}
      {job.issues.originalsPending && <Badge tone="amber">Originals pending</Badge>}
      {job.issues.urgentStock && <Badge tone="red">Urgent stock</Badge>}
      {job.issues.blocked && <Badge tone="red">Blocked</Badge>}
      {job.issueCount === 0 && <Badge tone="green">Compliant</Badge>}
    </div>
  );
}

function JobDetail({ job }: { job: SopComplianceJob }) {
  const sections = [
    { key: "preDay", label: "Pre-day", p: job.progress.preDay },
    { key: "warehouse", label: "Warehouse", p: job.progress.warehouse },
    { key: "visit", label: "Visit", p: job.progress.visit },
    { key: "docs", label: "Docs", p: job.progress.docs },
    { key: "eod", label: "EOD", p: job.progress.eod },
  ] as const;

  return (
    <div className="space-y-3 border-t border-slate-100 bg-slate-50/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900/40">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Customer / project</p>
          <p className="font-medium text-primary">
            {job.project?.customer?.name ?? "—"}
            {job.project ? ` · ${job.project.code}` : ""}
          </p>
          {job.project && <p className="text-xs text-muted">{job.project.name}</p>}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Assignee</p>
          <p className="font-medium text-primary">
            {job.assignee ? `${job.assignee.firstName} ${job.assignee.lastName}` : "Unassigned"}
          </p>
          {job.assignee?.email && <p className="text-xs text-muted">{job.assignee.email}</p>}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Assigned by</p>
          <p className="font-medium text-primary">
            {job.createdBy ? `${job.createdBy.firstName} ${job.createdBy.lastName}` : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Timeline</p>
          <p className="text-xs text-muted">Seen: {job.seenAt ? new Date(job.seenAt).toLocaleString() : "—"}</p>
          <p className="text-xs text-muted">Submitted: {job.submittedAt ? new Date(job.submittedAt).toLocaleString() : "—"}</p>
          <p className="text-xs text-muted">Verified: {job.verifiedAt ? new Date(job.verifiedAt).toLocaleString() : "—"}</p>
          <p className="text-xs text-muted">
            Originals: {job.originalsReturnedAt ? new Date(job.originalsReturnedAt).toLocaleString() : "Not returned"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Payment</p>
          <p className="font-medium text-primary">
            {job.paymentAmount != null
              ? `${job.paymentAmount} ${job.paymentMethod ?? ""}`
              : "—"}
          </p>
          {job.paymentReference && <p className="text-xs text-muted">Ref: {job.paymentReference}</p>}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Attachments</p>
          <p className="font-medium text-primary">{job.attachmentCount} file(s)</p>
          {job.missingDocLabels.length > 0 && (
            <ul className="mt-1 list-disc pl-4 text-xs text-red-600 dark:text-red-400">
              {job.missingDocLabels.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs uppercase tracking-wide text-muted">Checklist progress</p>
        <div className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <Badge key={s.key} tone={s.p.complete ? "green" : "amber"}>
              {s.label}: {s.p.done}/{s.p.total}
            </Badge>
          ))}
        </div>
      </div>

      {job.incompleteReason && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Incomplete reason</p>
          <p className="text-primary">{job.incompleteReason}</p>
          {job.rescheduleDate && (
            <p className="text-xs text-muted">Reschedule: {new Date(job.rescheduleDate).toLocaleDateString()}</p>
          )}
        </div>
      )}

      {job.completionNote && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Completion note</p>
          <p className="whitespace-pre-wrap text-primary">{job.completionNote}</p>
        </div>
      )}

      <Link
        href={`/team-tasks/${job.id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
      >
        Open full job <ExternalLink size={14} />
      </Link>
    </div>
  );
}

export default function SopCompliancePage() {
  const today = useMemo(() => localDateISO(new Date()), []);
  const [date, setDate] = useState("");
  const [days, setDays] = useState("14");
  const [assigneeId, setAssigneeId] = useState("");
  const [jobType, setJobType] = useState("");
  const [issue, setIssue] = useState<SopComplianceIssue>("any");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: assignableUsers } = useAssignableUsers();
  const { data, isLoading, isError, refetch, isFetching } = useSopCompliance({
    date: date || undefined,
    days: Number(days) || 14,
    assigneeId: assigneeId || undefined,
    jobType: jobType || undefined,
    issue,
  });

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Projects & Field Work"
        title="SOP Compliance"
        description="Company-wide Field Ops compliance for coordinators, managers, and admins — scans, checklists, originals, and urgent stock."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <BranchSwitcher />
            <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
              Refresh
            </Button>
          </div>
        }
      />

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Board date (optional)</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="!w-[11.5rem]" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Lookback days</label>
          <Select value={days} onChange={(e) => setDays(e.target.value)} className="!w-28" disabled={Boolean(date)}>
            <option value="7">7</option>
            <option value="14">14</option>
            <option value="30">30</option>
            <option value="60">60</option>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Assignee</label>
          <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="!w-48">
            <option value="">All assignees</option>
            {(assignableUsers ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Job type</label>
          <Select value={jobType} onChange={(e) => setJobType(e.target.value)} className="!w-52">
            <option value="">All types</option>
            {TASK_JOB_TYPES.map((t) => (
              <option key={t} value={t}>
                {TASK_JOB_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        {date && (
          <Button variant="ghost" size="sm" onClick={() => setDate(today)}>
            Today
          </Button>
        )}
        {date && (
          <Button variant="ghost" size="sm" onClick={() => setDate("")}>
            Clear date
          </Button>
        )}
      </Card>

      {isError && <Card className="p-4 text-sm text-red-600">Couldn&apos;t load SOP compliance.</Card>}
      {isLoading && <p className="text-sm text-muted">Loading…</p>}

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <Tile label="Compliance" value={summary.compliancePct} suffix="%" tone="green" />
          <Tile label="Jobs in scope" value={summary.totalJobs} />
          <Tile label="Avg checklist" value={summary.avgChecklistPct} suffix="%" />
          <Tile
            label="With issues"
            value={summary.withIssues}
            tone="amber"
            active={issue === "any" && summary.withIssues > 0}
            onClick={() => setIssue("any")}
          />
          <Tile
            label="Missing scans"
            value={summary.missingScans}
            tone="red"
            active={issue === "missingScans"}
            onClick={() => setIssue(issue === "missingScans" ? "any" : "missingScans")}
          />
          <Tile
            label="Incomplete checklist"
            value={summary.incompleteChecklist}
            tone="amber"
            active={issue === "incompleteChecklist"}
            onClick={() => setIssue(issue === "incompleteChecklist" ? "any" : "incompleteChecklist")}
          />
          <Tile
            label="Originals pending"
            value={summary.originalsPending}
            tone="amber"
            active={issue === "originalsPending"}
            onClick={() => setIssue(issue === "originalsPending" ? "any" : "originalsPending")}
          />
          <Tile
            label="Urgent stock flags"
            value={summary.urgentStock}
            tone="red"
            active={issue === "urgentStock"}
            onClick={() => setIssue(issue === "urgentStock" ? "any" : "urgentStock")}
          />
          <Tile
            label="Blocked jobs"
            value={summary.blocked}
            tone="red"
            active={issue === "blocked"}
            onClick={() => setIssue(issue === "blocked" ? "any" : "blocked")}
          />
          <Tile label="Awaiting verify" value={summary.submittedAwaitingVerify} tone="blue" />
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-primary">
            Job details {data ? `(${data.jobs.length})` : ""}
            {issue !== "any" ? ` · filter: ${issue}` : ""}
          </h2>
          {issue !== "any" && (
            <Button variant="ghost" size="sm" onClick={() => setIssue("any")}>
              Clear issue filter
            </Button>
          )}
        </div>

        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {(data?.jobs ?? []).map((job) => {
            const open = !!expanded[job.id];
            return (
              <li key={job.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  onClick={() => setExpanded((e) => ({ ...e, [job.id]: !e[job.id] }))}
                >
                  <span className="mt-1 text-slate-400">{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-primary">{job.title}</span>
                      <Badge tone={TASK_STATUS_TONE[job.status]}>{TASK_STATUS_LABELS[job.status]}</Badge>
                      <Badge tone="slate">{TASK_JOB_LABELS[job.jobType]}</Badge>
                      <span className="text-xs text-muted">{job.checklistPct}% checklist</span>
                    </div>
                    <IssueBadges job={job} />
                    <p className="text-xs text-muted">
                      {job.assignee ? `${job.assignee.firstName} ${job.assignee.lastName}` : "Unassigned"}
                      {job.project?.customer?.name ? ` · ${job.project.customer.name}` : ""}
                      {job.dueDate ? ` · due ${new Date(job.dueDate).toLocaleDateString()}` : ""}
                      {` · ${job.attachmentCount} attachment(s)`}
                    </p>
                  </div>
                </button>
                {open && <JobDetail job={job} />}
              </li>
            );
          })}
          {!isLoading && (data?.jobs.length ?? 0) === 0 && (
            <li className="p-6 text-sm text-muted">No jobs match these filters.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
