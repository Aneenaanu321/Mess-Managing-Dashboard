"use client";

import { useState } from "react";
import clsx from "clsx";
import { Building2, ShieldCheck, Users as UsersIcon } from "lucide-react";
import { useOrgSettings, useRoleSettings, useUserSettings } from "@/lib/settings";
import { Badge, Card } from "@/components/ui";

type Tab = "org" | "roles" | "users";

const TABS: { key: Tab; label: string; icon: typeof Building2 }[] = [
  { key: "org", label: "Organization", icon: Building2 },
  { key: "roles", label: "Roles", icon: ShieldCheck },
  { key: "users", label: "Users", icon: UsersIcon },
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
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Organization details, roles, and user administration.</p>
      </div>

      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium",
                active ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700",
              )}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "org" && <OrgSection />}
      {tab === "roles" && <RolesSection />}
      {tab === "users" && <UsersSection />}
    </div>
  );
}

function OrgSection() {
  const { data: org, isLoading, isError } = useOrgSettings();

  if (isError) {
    return <Card className="p-4 text-sm text-red-600">Couldn&apos;t load organization settings.</Card>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Company</h2>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Name</dt>
              <dd className="mt-0.5 text-sm text-slate-900">{org?.name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Legal name</dt>
              <dd className="mt-0.5 text-sm text-slate-900">{org?.legalName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Tax ID</dt>
              <dd className="mt-0.5 text-sm text-slate-900">{org?.taxId ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Currency</dt>
              <dd className="mt-0.5 text-sm text-slate-900">{org?.currency}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Timezone</dt>
              <dd className="mt-0.5 text-sm text-slate-900">{org?.timezone}</dd>
            </div>
          </dl>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Branches</h2>
        </div>
        {!isLoading && (org?.branches.length ?? 0) === 0 && <p className="p-6 text-sm text-slate-500">No branches yet.</p>}
        {(org?.branches.length ?? 0) > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">City</th>
                <th className="px-4 py-2.5">Country</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {org?.branches.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{b.code}</td>
                  <td className="px-4 py-2.5 text-slate-700">{b.name}</td>
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
    return <Card className="p-4 text-sm text-red-600">Couldn&apos;t load roles.</Card>;
  }

  return (
    <Card className="overflow-hidden">
      {isLoading && <p className="p-6 text-sm text-slate-500">Loading roles…</p>}
      {!isLoading && (
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Description</th>
              <th className="px-4 py-2.5">Permissions</th>
              <th className="px-4 py-2.5">Users</th>
              <th className="px-4 py-2.5">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {roles?.map((role) => (
              <tr key={role.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{role.name}</td>
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
    return <Card className="p-4 text-sm text-red-600">Couldn&apos;t load users.</Card>;
  }

  return (
    <Card className="overflow-hidden">
      {isLoading && <p className="p-6 text-sm text-slate-500">Loading users…</p>}
      {!isLoading && (users?.length ?? 0) === 0 && <p className="p-6 text-sm text-slate-500">No users yet.</p>}
      {!isLoading && (users?.length ?? 0) > 0 && (
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Branch</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users?.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
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
