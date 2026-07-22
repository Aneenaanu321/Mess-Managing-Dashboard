"use client";

import { useBranches } from "@/lib/branches";
import { Select } from "@/components/ui";

/**
 * Basic branch-switching UI (PRD §9: data model supports multi-branch from
 * day one "even if UI for switching is basic in v1"). Only renders when the
 * company actually has more than one branch — a single-branch tenant would
 * just see a useless dropdown with one option.
 */
export function BranchFilter({ value, onChange }: { value: string; onChange: (branchId: string) => void }) {
  const { data } = useBranches();
  const branches = data ?? [];

  if (branches.length <= 1) return null;

  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className="w-full sm:w-52">
      <option value="">All branches</option>
      {branches.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </Select>
  );
}
