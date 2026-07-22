"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./api-client";

export interface BranchOption {
  id: string;
  name: string;
}

export function useBranches() {
  return useQuery({
    queryKey: ["dashboard", "branches"],
    queryFn: async () => (await apiClient.get<BranchOption[]>("/dashboard/branches")).data,
    staleTime: 5 * 60_000,
  });
}
