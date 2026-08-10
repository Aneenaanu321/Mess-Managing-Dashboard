"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import { Building2, ClipboardList, Hash, Languages, ScrollText, ShieldCheck, Timer, Users as UsersIcon } from "lucide-react";
import {
  useOrgSettings,
  useRoleSettings,
  useUserSettings,
  useSequenceSettings,
  useAuditLog,
  useSlaPolicies,
  useUpsertSlaPolicy,
  TicketPriority,
} from "@/lib/settings";
import { useLeadOpsSettings, useUpdateLeadOpsSettings } from "@/lib/sales-ops";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import { getPageLabel } from "@/lib/nav-labels";
import { useLocale, Locale } from "@/lib/i18n";

type Tab = "org" | "lead-ops" | "roles" | "users" | "sequences" | "sla" | "audit-log" | "language";

const TABS: { key: Tab; label: string; icon: typeof Building2 }[] = [
  { key: "org", label: "Organization", icon: Building2 },
  { key: "lead-ops", label: "Lead Ops", icon: ClipboardList },
  { key: "language", label: "Language", icon: Languages },
  { key: "roles", label: "Roles", icon: ShieldCheck },
  { key: "users", label: "Users", icon: UsersIcon },
  { key: "sequences", label: "Number Sequences", icon: Hash },
  { key: "sla", label: "SLA Policies", icon: Timer },
  { key: "audit-log", label: "Audit Log", icon: ScrollText },
];

const STATUS_TONE: Record<string, "green" | "slate" | "red"> = {
  ACTIVE: "green",
  INACTIVE: "slate",
  SUSPENDED: "red",
};

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("org");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-primary">{getPageLabel("/settings")}</h1>
        <p className="text-sm text-slate-500">Organization details, roles, and user administration.</p>
      </div>

      <div className="mb-6 flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium",
                active ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-300",
              )}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "org" && <OrgSection />}
      {tab === "lead-ops" && <LeadOpsSection />}
      {tab === "language" && <LanguageSection />}
      {tab === "roles" && <RolesSection />}
      {tab === "users" && <UsersSection />}
      {tab === "sequences" && <SequencesSection />}
      {tab === "sla" && <SlaPoliciesSection />}
      {tab === "audit-log" && <AuditLogSection />}
    </div>
  );
}

function LanguageSection() {
  const { locale, setLocale, t } = useLocale();
  return (
    <Card className="max-w-lg space-y-3 p-5">
      <h2 className="text-sm font-semibold text-primary">{t("settings.language")}</h2>
      <p className="text-xs text-slate-500">{t("settings.languageHint")}</p>
      <Select value={locale} onChange={(e) => setLocale(e.target.value as Locale)} aria-label="Language">
        <option value="en">English</option>
        <option value="ar">العربية (Arabic)</option>
      </Select>
    </Card>
  );
}

function LeadOpsSection() {
  const { data: user } = useCurrentUser();
  const { data, isLoading, isError } = useLeadOpsSettings();
  const update = useUpdateLeadOpsSettings();
  const [mode, setMode] = useState("MANUAL");
  const [slaHours, setSlaHours] = useState("24");
  const [chaseDays, setChaseDays] = useState("7");

  useEffect(() => {
    if (!data) return;
    setMode(data.leadAssignMode ?? "MANUAL");
    setSlaHours(String(data.leadSlaHours ?? 24));
    setChaseDays(String(data.quoteChaseDays ?? 7));
  }, [data]);

  const canEdit = hasPermission(user, "settings:manage_org") || hasPermission(user, "lead:assign");

  if (isError) {
    return <Card className="p-4 text-sm text-red-600 dark:text-red-400">Couldn&apos;t load lead ops settings.</Card>;
  }

  return (
    <Card className="max-w-lg space-y-4 p-6">
      <div>
        <h2 className="text-sm font-semibold text-primary">Lead assignment & chase</h2>
        <p className="mt-1 text-xs text-slate-500">Controls round-robin, response SLA, and quote chase windows.</p>
      </div>
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Assign mode</label>
            <Select value={mode} onChange={(e) => setMode(e.target.value)} disabled={!canEdit}>
              <option value="MANUAL">Manual</option>
              <option value="ROUND_ROBIN">Round-robin</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Lead response SLA (hours)</label>
            <Input type="number" min={1} value={slaHours} onChange={(e) => setSlaHours(e.target.value)} disabled={!canEdit} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Quote chase after (days)</label>
            <Input type="number" min={1} value={chaseDays} onChange={(e) => setChaseDays(e.target.value)} disabled={!canEdit} />
          </div>
          {canEdit && (
            <Button
              disabled={update.isPending}
              onClick={() =>
                update.mutate({
                  leadAssignMode: mode,
                  leadSlaHours: Number(slaHours),
                  quoteChaseDays: Number(chaseDays),
                })
              }
            >
              {update.isPending ? "Saving…" : "Save"}
            </Button>
          )}
        </>
      )}
    </Card>
  );
}

function OrgSection() {
  const { data: org, isLoading, isError } = useOrgSettings();

  if (isError) {
    return <Card className="p-4 text-sm text-red-600 dark:text-red-400">Couldn&apos;t load organization settings.</Card>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-primary">Company</h2>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Name</dt>
              <dd className="mt-0.5 text-sm text-primary">{org?.name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Legal name</dt>
              <dd className="mt-0.5 text-sm text-primary">{org?.legalName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Tax ID</dt>
              <dd className="mt-0.5 text-sm text-primary">{org?.taxId ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Currency</dt>
              <dd className="mt-0.5 text-sm text-primary">{org?.currency}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Timezone</dt>
              <dd className="mt-0.5 text-sm text-primary">{org?.timezone}</dd>
            </div>
          </dl>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-1 text-sm font-semibold text-primary">Lead Intake Webhook</h2>
        <p className="mb-3 text-xs text-slate-500">
          Point your website contact form or marketing tool at this endpoint to auto-create leads. Keep the token private —
          anyone with it can create leads in your account.
        </p>
        {!isLoading && org && (
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
{`POST ${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/public/new-inquiries
Content-Type: application/json

{
  "webhookToken": "${org.webhookToken}",
  "companyName": "Acme Corp",
  "contactName": "Jane Doe",
  "email": "jane@acme.com",
  "source": "WEBSITE"
}`}
          </pre>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-700 p-4">
          <h2 className="text-sm font-semibold text-primary">Branches</h2>
        </div>
        {!isLoading && (org?.branches.length ?? 0) === 0 && <p className="p-6 text-sm text-slate-500">No branches yet.</p>}
        {(org?.branches.length ?? 0) > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">City</th>
                <th className="px-4 py-2.5">Country</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {org?.branches.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-2.5 font-medium text-primary">{b.code}</td>
                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{b.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{b.city ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{b.country ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function RolesSection() {
  const { data: roles, isLoading, isError } = useRoleSettings();

  if (isError) {
    return <Card className="p-4 text-sm text-red-600 dark:text-red-400">Couldn&apos;t load roles.</Card>;
  }

  return (
    <Card className="overflow-hidden">
      {isLoading && <p className="p-6 text-sm text-slate-500">Loading roles…</p>}
      {!isLoading && (
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Description</th>
              <th className="px-4 py-2.5">Permissions</th>
              <th className="px-4 py-2.5">Users</th>
              <th className="px-4 py-2.5">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {roles?.map((role) => (
              <tr key={role.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50">
                <td className="px-4 py-3 font-medium text-primary">{role.name}</td>
                <td className="px-4 py-3 text-slate-600">{role.description ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{role.permissionCount}</td>
                <td className="px-4 py-3 text-slate-600">{role.userCount}</td>
                <td className="px-4 py-3">
                  <Badge tone={role.isSystem ? "blue" : "slate"}>{role.isSystem ? "System" : "Custom"}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function UsersSection() {
  const { data: users, isLoading, isError } = useUserSettings();

  if (isError) {
    return <Card className="p-4 text-sm text-red-600 dark:text-red-400">Couldn&apos;t load users.</Card>;
  }

  return (
    <Card className="overflow-hidden">
      {isLoading && <p className="p-6 text-sm text-slate-500">Loading users…</p>}
      {!isLoading && (users?.length ?? 0) === 0 && <p className="p-6 text-sm text-slate-500">No users yet.</p>}
      {!isLoading && (users?.length ?? 0) > 0 && (
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Branch</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {users?.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50">
                <td className="px-4 py-3 font-medium text-primary">{u.name}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3 text-slate-600">{u.role}</td>
                <td className="px-4 py-3 text-slate-600">{u.branch ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONE[u.status] ?? "slate"}>{u.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function SequencesSection() {
  const { data: sequences, isLoading, isError } = useSequenceSettings();

  if (isError) {
    return <Card className="p-4 text-sm text-red-600 dark:text-red-400">Couldn&apos;t load number sequences.</Card>;
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-200 dark:border-slate-700 p-4">
        <h2 className="text-sm font-semibold text-primary">Document Numbering</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Read-only — these counters drive LEAD/CUST/QT/CPO/SO/PRJ/etc. codes. Editing isn&apos;t exposed here to avoid
          issuing a duplicate or out-of-order document number.
        </p>
      </div>
      {isLoading && <p className="p-6 text-sm text-slate-500">Loading…</p>}
      {!isLoading && (sequences?.length ?? 0) === 0 && <p className="p-6 text-sm text-slate-500">No sequences generated yet.</p>}
      {(sequences?.length ?? 0) > 0 && (
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Key</th>
              <th className="px-4 py-2.5">Year</th>
              <th className="px-4 py-2.5">Last Issued Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {sequences?.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50">
                <td className="px-4 py-3 font-medium text-primary">{s.key}</td>
                <td className="px-4 py-3 text-slate-600">{s.year}</td>
                <td className="px-4 py-3 text-slate-600">{s.lastValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

const PRIORITY_TONE: Record<TicketPriority, "red" | "amber" | "blue" | "slate"> = {
  CRITICAL: "red",
  HIGH: "amber",
  MEDIUM: "blue",
  LOW: "slate",
};

function SlaPoliciesSection() {
  const { data: policies, isLoading, isError } = useSlaPolicies();
  const { data: user } = useCurrentUser();
  const canManage = hasPermission(user, "settings:manage_org");

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-200 dark:border-slate-700 p-4">
        <h2 className="text-sm font-semibold text-primary">Support SLA Targets</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Time-to-first-response and time-to-resolution targets per ticket priority, in minutes. Drives the SLA_RISK/SLA_BREACH
          reminders <code>apps/worker</code> sends.
        </p>
      </div>
      {isError && <p className="p-6 text-sm text-red-600 dark:text-red-400">Couldn&apos;t load SLA policies.</p>}
      {isLoading && <p className="p-6 text-sm text-slate-500">Loading…</p>}
      {!isLoading && !isError && (
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Priority</th>
              <th className="px-4 py-2.5">Response (mins)</th>
              <th className="px-4 py-2.5">Resolution (mins)</th>
              {canManage && <th className="px-4 py-2.5"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {policies?.map((policy) => (
              <SlaPolicyRow key={policy.priority} policy={policy} canManage={canManage} />
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function SlaPolicyRow({
  policy,
  canManage,
}: {
  policy: { priority: TicketPriority; responseMins: number | null; resolutionMins: number | null };
  canManage: boolean;
}) {
  const upsert = useUpsertSlaPolicy();
  const [responseMins, setResponseMins] = useState(String(policy.responseMins ?? ""));
  const [resolutionMins, setResolutionMins] = useState(String(policy.resolutionMins ?? ""));
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    const response = Number(responseMins);
    const resolution = Number(resolutionMins);
    if (!response || !resolution || response <= 0 || resolution <= 0) {
      setError("Enter positive numbers");
      return;
    }
    try {
      await upsert.mutateAsync({ priority: policy.priority, responseMins: response, resolutionMins: resolution });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50">
      <td className="px-4 py-3">
        <Badge tone={PRIORITY_TONE[policy.priority]}>{policy.priority}</Badge>
      </td>
      <td className="px-4 py-3">
        {canManage ? (
          <Input
            type="number"
            min={1}
            value={responseMins}
            onChange={(e) => setResponseMins(e.target.value)}
            className="w-28"
          />
        ) : (
          (policy.responseMins ?? "—")
        )}
      </td>
      <td className="px-4 py-3">
        {canManage ? (
          <Input
            type="number"
            min={1}
            value={resolutionMins}
            onChange={(e) => setResolutionMins(e.target.value)}
            className="w-28"
          />
        ) : (
          (policy.resolutionMins ?? "—")
        )}
      </td>
      {canManage && (
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending ? "Saving…" : "Save"}
            </Button>
            {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
          </div>
        </td>
      )}
    </tr>
  );
}

function AuditLogSection() {
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data: users } = useUserSettings();
  const { data, isLoading, isError } = useAuditLog({
    entityType: entityType || undefined,
    action: action || undefined,
    actorId: actorId || undefined,
    dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    dateTo: dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : undefined,
  });
  const entries = data?.data ?? [];

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Input
          placeholder="Filter by entity type (e.g. Quotation)"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="max-w-xs"
        />
        <Select value={action} onChange={(e) => setAction(e.target.value)} className="w-full sm:w-44">
          <option value="">All actions</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="APPROVE">APPROVE</option>
          <option value="ASSIGN">ASSIGN</option>
          <option value="CONVERT">CONVERT</option>
        </Select>
        <Select value={actorId} onChange={(e) => setActorId(e.target.value)} className="w-full sm:w-48">
          <option value="">All users</option>
          {users?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full sm:w-40" aria-label="From date" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full sm:w-40" aria-label="To date" />
      </Card>

      <Card className="overflow-hidden">
        {isError && <p className="p-6 text-sm text-red-600 dark:text-red-400">Couldn&apos;t load the audit log.</p>}
        {isLoading && <p className="p-6 text-sm text-slate-500">Loading…</p>}
        {!isLoading && entries.length === 0 && <p className="p-6 text-sm text-slate-500">No matching audit entries.</p>}
        {entries.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">When</th>
                <th className="px-4 py-2.5">Actor</th>
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {entries.map((entry) => (
                <tr key={entry.id} className="align-top hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{new Date(entry.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : <span className="text-slate-400">System</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="blue">{entry.action}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {entry.entityType} <span className="text-slate-400">#{entry.entityId.slice(-8)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
