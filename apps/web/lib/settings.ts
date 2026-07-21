"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  webhookToken: string;
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

export interface NumberSequenceRow {
  id: string;
  key: string;
  year: number;
  lastValue: number;
}

export function useSequenceSettings() {
  return useQuery({
    queryKey: ["settings", "sequences"],
    queryFn: async () => (await apiClient.get<NumberSequenceRow[]>("/settings/sequences")).data,
  });
}

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  before: unknown;
  after: unknown;
  createdAt: string;
  actor: { id: string; firstName: string; lastName: string; email: string } | null;
}

export function useAuditLog(params: { entityType?: string; action?: string; page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.entityType) query.set("entityType", params.entityType);
  if (params.action) query.set("action", params.action);
  if (params.page) query.set("page", String(params.page));

  return useQuery({
    queryKey: ["settings", "audit-log", params],
    queryFn: async () => apiClient.get<AuditLogEntry[]>(`/settings/audit-log?${query.toString()}`),
  });
}

export type TicketPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface SlaPolicyRow {
  id: string | null;
  priority: TicketPriority;
  responseMins: number | null;
  resolutionMins: number | null;
}

export function useSlaPolicies() {
  return useQuery({
    queryKey: ["settings", "sla-policies"],
    queryFn: async () => (await apiClient.get<SlaPolicyRow[]>("/settings/sla-policies")).data,
  });
}

export function useUpsertSlaPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { priority: TicketPriority; responseMins: number; resolutionMins: number }) =>
      (await apiClient.patch<SlaPolicyRow>("/settings/sla-policies", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings", "sla-policies"] }),
  });
}
