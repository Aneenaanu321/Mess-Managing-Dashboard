"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useDevice, useUpdateDevice, DEVICE_STATUSES, DEVICE_STATUS_TONE, DeviceStatus } from "@/lib/devices";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Card, Select } from "@/components/ui";
import { getPageLabel } from "@/lib/nav-labels";

export default function DeviceDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: device, isLoading } = useDevice(params.id);
  const { data: user } = useCurrentUser();
  const updateDevice = useUpdateDevice();
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!device) return <p className="text-sm text-slate-500">Device not found.</p>;

  const canManage = hasPermission(user, "device:manage");

  async function handleStatusChange(status: string) {
    setError(null);
    try {
      await updateDevice.mutateAsync({ id: device!.id, input: { status: status as DeviceStatus } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update device");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{device.type.replaceAll("_", " ")}</p>
          <h1 className="text-xl font-semibold text-primary">{device.serialNumber}</h1>
          <p className="text-sm text-slate-500">{device.product?.name}</p>
        </div>
        {canManage ? (
          <Select value={device.status} onChange={(e) => handleStatusChange(e.target.value)} className="w-40">
            {DEVICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
        ) : (
          <Badge tone={DEVICE_STATUS_TONE[device.status]}>{device.status.replaceAll("_", " ")}</Badge>
        )}
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Details</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Product" value={device.product?.name ?? "—"} />
            <Row label="SKU" value={device.product?.sku ?? "—"} />
            <Row
              label="Project"
              value={device.project ? device.project.code : "—"}
            />
            <Row label="Site" value={device.site?.label ?? "—"} />
            <Row label="Location" value={device.location ?? "—"} />
            <Row label="Firmware" value={device.firmwareVersion ?? "—"} />
            <Row label="Installed" value={device.installedAt ? new Date(device.installedAt).toLocaleDateString() : "—"} />
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">{getPageLabel("/customer-support")}</h2>
          {device.tickets?.length ? (
            <ul className="space-y-1.5 text-sm">
              {device.tickets.map((t) => (
                <li key={t.id} className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5">
                  <Link href={`/customer-support/${t.id}`} className="text-brand-600 hover:underline">
                    {t.code}
                  </Link>
                  <span className="text-slate-500">{t.status.replaceAll("_", " ")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No tickets raised for this device.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-primary">{value}</dd>
    </div>
  );
}
