"use client";

import { useBranches } from "@/lib/branches";
import { useCurrentUser, useSwitchBranch } from "@/lib/auth";
import { Select } from "@/components/ui";

/** Switches the signed-in user's home branch (JWT + profile). Shown when company has 2+ branches. */
export function BranchSwitcher({ className }: { className?: string }) {
  const { data: user } = useCurrentUser();
  const { data: branches } = useBranches();
  const switchBranch = useSwitchBranch();
  const list = branches ?? [];

  if (list.length <= 1) return null;

  return (
    <Select
      className={className ?? "w-full sm:w-52"}
      value={user?.branch?.id ?? ""}
      disabled={switchBranch.isPending}
      onChange={(e) => switchBranch.mutate(e.target.value || null)}
      aria-label="Switch branch"
    >
      <option value="">All / company-wide</option>
      {list.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </Select>
  );
}
