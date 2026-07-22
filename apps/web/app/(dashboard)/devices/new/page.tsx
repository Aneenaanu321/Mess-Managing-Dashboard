"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateDevice, DEVICE_TYPES } from "@/lib/devices";
import { useProjects } from "@/lib/projects";
import { Button, Input, Label, Select, Card } from "@/components/ui";

export default function NewDevicePage() {
  const router = useRouter();
  const createDevice = useCreateDevice();
  const { data: projectsData } = useProjects({ page: 1 });
  const projects = projectsData?.data ?? [];

  const [form, setForm] = useState({
    serialNumber: "",
    type: DEVICE_TYPES[0] ?? "READER",
    productId: "",
    siteId: "",
    projectId: "",
    firmwareVersion: "",
    location: "",
  });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const device = await createDevice.mutateAsync({
        serialNumber: form.serialNumber,
        type: form.type,
        productId: form.productId,
        siteId: form.siteId || undefined,
        projectId: form.projectId || undefined,
        firmwareVersion: form.firmwareVersion || undefined,
        location: form.location || undefined,
      });
      router.push(`/devices/${device.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create device");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-primary">New Device</h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="serialNumber">Serial number</Label>
              <Input id="serialNumber" required value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="type">Device type</Label>
              <Select id="type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as never })}>
                {DEVICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="productId">Product ID</Label>
            <Input id="productId" required placeholder="clxxxxxxxxxxxxxx" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} />
            <p className="mt-1 text-xs text-slate-400">The catalog product this device is an instance of.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="projectId">Project (optional)</Label>
              <Select id="projectId" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                <option value="">Unassigned</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="siteId">Site ID (optional)</Label>
              <Input id="siteId" value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firmwareVersion">Firmware version (optional)</Label>
              <Input id="firmwareVersion" value={form.firmwareVersion} onChange={(e) => setForm({ ...form, firmwareVersion: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="location">Location (optional)</Label>
              <Input id="location" placeholder="Entrance Gate 2, Ground Floor" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>

          {error && <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={createDevice.isPending}>
              {createDevice.isPending ? "Creating…" : "Create Device"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
