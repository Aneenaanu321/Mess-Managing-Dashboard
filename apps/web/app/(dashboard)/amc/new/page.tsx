"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateAmcContract } from "@/lib/amc";
import { useCustomers } from "@/lib/customers";
import { useDevices } from "@/lib/devices";
import { Button, Input, Label, Select, Card } from "@/components/ui";

export default function NewAmcContractPage() {
  const router = useRouter();
  const createContract = useCreateAmcContract();
  const { data: customersData } = useCustomers({ pageSize: 100 });
  const customers = customersData?.data ?? [];
  const { data: devicesData } = useDevices({ page: 1 });
  const devices = devicesData?.data ?? [];

  const [form, setForm] = useState({ customerId: "", startDate: "", endDate: "", annualValue: "" });
  const [deviceIds, setDeviceIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function toggleDevice(id: string) {
    setDeviceIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const contract = await createContract.mutateAsync({
        customerId: form.customerId,
        startDate: form.startDate,
        endDate: form.endDate,
        annualValue: Number(form.annualValue),
        deviceIds: deviceIds.length ? deviceIds : undefined,
      });
      router.push(`/amc/${contract.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create AMC contract");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-primary">New AMC Contract</h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="customerId">Customer</Label>
            <Select id="customerId" required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>

          <div>
            <Label htmlFor="annualValue">Annual contract value</Label>
            <Input
              id="annualValue"
              type="number"
              min={0}
              step="0.01"
              required
              value={form.annualValue}
              onChange={(e) => setForm({ ...form, annualValue: e.target.value })}
            />
          </div>

          <div>
            <Label>Covered devices (optional)</Label>
            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700 p-3">
              {devices.length === 0 && <p className="text-sm text-slate-400">No devices available.</p>}
              {devices.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={deviceIds.includes(d.id)} onChange={() => toggleDevice(d.id)} />
                  {d.serialNumber} — {d.type.replaceAll("_", " ")}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={createContract.isPending}>
              {createContract.isPending ? "Creating…" : "Create Contract"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
