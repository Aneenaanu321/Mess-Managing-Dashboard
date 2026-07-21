"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./api-client";

export interface OrgBranch {
  id: string;
  name: string;
  code: string;
  city: string | null;
  country: string | null;
}

export interface OrgSettings {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  currency: string;
  timezone: string;
  branches: OrgBranch[];
}

export interface RoleSummary {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionCount: number;
  userCount: number;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  roleKey: string;
  branch: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  lastLoginAt: string | null;
}

export function useOrgSettings() {
  return useQuery({
    queryKey: ["settings", "org"],
    queryFn: async () => (await apiClient.get<OrgSettings>("/settings/org")).data,
  });
}

export function useRoleSettings() {
  return useQuery({
    queryKey: ["settings", "roles"],
    queryFn: async () => (await apiClient.get<RoleSummary[]>("/settings/roles")).data,
  });
}

export function useUserSettings() {
  return useQuery({
    queryKey: ["settings", "users"],
    queryFn: async () => (await apiClient.get<UserSummary[]>("/settings/users")).data,
  });
}
