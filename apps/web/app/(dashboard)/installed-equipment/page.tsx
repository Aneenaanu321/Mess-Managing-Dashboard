"use client";

import { useState } from "react";
import Link from "next/link";
import { useDevices, DEVICE_TYPES, DEVICE_STATUSES, DEVICE_STATUS_TONE, Device } from "@/lib/devices";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Input, Select, Card } from "@/components/ui";
import { getNewItemLabel, getPageLabel } from "@/lib/nav-labels";

export default function DevicesPage() {
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const { data: user } = useCurrentUser();
  const { data, isLoading, isError } = useDevices({ type: type || undefined, status: status || undefined, search: search || undefined });

  const devices = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary">{getPageLabel("/installed-equipment")}</h1>
          <p className="text-sm text-slate-500">
            {data?.meta?.total ?? 0} device{data?.meta?.total === 1 ? "" : "s"} tracked
          </p>
        </div>
        {hasPermission(user, "device:manage") && (
          <Link href="/installed-equipment/new">
            <Button>+ {getNewItemLabel("/installed-equipment")}</Button>
          </Link>
        )}
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <Input placeholder="Search serial number, location..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={type} onChange={(e) => setType(e.target.value)} className="max-w-xs">
          <option value="">All types</option>
          {DEVICE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
          <option value="">All statuses</option>
          {DEVICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-6 text-sm text-slate-500">Loading devices…</p>}
        {isError && <p className="p-6 text-sm text-red-600 dark:text-red-400">Couldn&apos;t load devices.</p>}
        {!isLoading && !isError && devices.length === 0 && (
          <p className="p-6 text-sm text-slate-500">No devices match these filters yet.</p>
        )}
        {devices.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Serial Number</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Product</th>
                <th className="px-4 py-2.5">Project</th>
                <th className="px-4 py-2.5">Site</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {devices.map((d: Device) => (
                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/installed-equipment/${d.id}`} className="font-medium text-brand-600 hover:underline">
                      {d.serialNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{d.type.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3 text-slate-600">{d.product?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{d.project?.code ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{d.site?.label ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={DEVICE_STATUS_TONE[d.status]}>{d.status.replaceAll("_", " ")}</Badge>
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
