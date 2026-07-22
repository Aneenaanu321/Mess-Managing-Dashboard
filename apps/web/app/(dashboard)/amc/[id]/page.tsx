"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAmcContract, useUpdateAmcContract, AMC_STATUSES, AMC_STATUS_TONE, AmcStatus } from "@/lib/amc";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Card, Select } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";

export default function AmcContractDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: contract, isLoading } = useAmcContract(params.id);
  const { data: user } = useCurrentUser();
  const updateContract = useUpdateAmcContract();
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!contract) return <p className="text-sm text-slate-500">Contract not found.</p>;

  const canManage = hasPermission(user, "amc:manage");

  async function handleStatusChange(status: string) {
    if (status === "CANCELLED" && contract!.status !== "CANCELLED") {
      const ok = await confirm({
        title: "Cancel AMC contract?",
        message: "Covered devices will no longer receive AMC support under this contract.",
        confirmLabel: "Cancel contract",
        variant: "danger",
      });
      if (!ok) return;
    }
    setError(null);
    try {
      await updateContract.mutateAsync({ id: contract!.id, input: { status: status as AmcStatus } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update contract");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-400">{contract.customer?.name}</p>
          <h1 className="text-xl font-semibold text-primary">{contract.code}</h1>
          {contract.expiringSoon && (
            <p className="mt-1 text-sm font-medium text-amber-700">Expires in {contract.daysToExpiry} day{contract.daysToExpiry === 1 ? "" : "s"}</p>
          )}
        </div>
        {canManage ? (
          <Select value={contract.status} onChange={(e) => handleStatusChange(e.target.value)} className="!w-44 shrink-0">
            {AMC_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
        ) : (
          <Badge tone={AMC_STATUS_TONE[contract.status]}>{contract.status.replaceAll("_", " ")}</Badge>
        )}
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Details</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Customer" value={contract.customer?.name ?? "—"} />
            <Row label="Contract value" value={`${contract.currency} ${Number(contract.contractValue).toLocaleString()}`} />
            <Row label="Start date" value={new Date(contract.startDate).toLocaleDateString()} />
            <Row label="End date" value={new Date(contract.endDate).toLocaleDateString()} />
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Covered Devices</h2>
          {contract.devices?.length ? (
            <ul className="space-y-1.5 text-sm">
              {contract.devices.map((d) => (
                <li key={d.id} className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5">
                  <span className="text-primary">{d.device.serialNumber}</span>
                  <span className="text-slate-500">{d.device.type.replaceAll("_", " ")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No devices covered under this contract.</p>
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
