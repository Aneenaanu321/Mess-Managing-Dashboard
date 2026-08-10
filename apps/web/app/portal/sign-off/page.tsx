"use client";

import { useState } from "react";
import { PenLine } from "lucide-react";
import { usePortalJobsNeedingSignOff, usePortalSignOff } from "@/lib/portal";
import { Card } from "@/components/ui";
import { SignaturePad } from "@/components/SignaturePad";

export default function PortalSignOffPage() {
  const { data: jobs, isLoading } = usePortalJobsNeedingSignOff();
  const signOff = usePortalSignOff();
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-primary">Sign delivery / invoice</h1>
        <p className="mt-1 text-sm text-slate-500">
          Digitally sign open field jobs linked to your account — less paper, clearer audits.
        </p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {!isLoading && (jobs?.length ?? 0) === 0 && (
        <Card className="p-6 text-sm text-slate-500">No open jobs waiting for your signature.</Card>
      )}

      <div className="space-y-3">
        {(jobs ?? []).map((job) => (
          <Card key={job.id} className="space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-primary">{job.title}</p>
                <p className="text-xs text-slate-500">
                  {job.jobType.replaceAll("_", " ")}
                  {job.dueDate ? ` · Due ${new Date(job.dueDate).toLocaleDateString()}` : ""}
                  {job.invoice ? ` · ${job.invoice.code}` : ""}
                  {job.salesOrder ? ` · ${job.salesOrder.code}` : ""}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
                onClick={() => setActiveId((id) => (id === job.id ? null : job.id))}
              >
                <PenLine size={14} />
                {activeId === job.id ? "Hide pad" : "Sign now"}
              </button>
            </div>
            {activeId === job.id && (
              <SignaturePad
                pending={signOff.isPending}
                onSubmit={async (payload) => {
                  await signOff.mutateAsync({ id: job.id, input: payload });
                  setActiveId(null);
                }}
              />
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
