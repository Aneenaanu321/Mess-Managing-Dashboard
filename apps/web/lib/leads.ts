"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { toast } from "./toast";

export interface Lead {
  id: string;
  code: string;
  companyName: string;
  contactName: string;
  email: string | null;
  phone: string | null;
  source: string;
  industry: string;
  status: "NEW" | "CONTACTED" | "QUALIFIED" | "DISQUALIFIED" | "CONVERTED";
  score: number;
  owner: { id: string; firstName: string; lastName: string } | null;
  notes?: string | null;
  internalNotes?: string | null;
  firstContactedAt?: string | null;
  createdAt: string;
}

export interface CreateLeadInput {
  companyName: string;
  contactName: string;
  email?: string;
  phone?: string;
  source: string;
  industry: string;
  notes?: string;
}

export function useLeads(
  params: { status?: string; search?: string; page?: number; unassigned?: boolean; slaBreached?: boolean } = {},
) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));
  if (params.unassigned) query.set("unassigned", "true");
  if (params.slaBreached) query.set("slaBreached", "true");

  return useQuery({
    queryKey: ["leads", params],
    queryFn: async () => apiClient.get<Lead[]>(`/leads?${query.toString()}`),
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ["leads", id],
    queryFn: async () => (await apiClient.get<Lead>(`/leads/${id}`)).data,
    enabled: !!id,
  });
}

export interface BulkImportResult {
  total: number;
  created: number;
  failed: { row: number; error?: string }[];
}

export function useBulkImportLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Record<string, unknown>[]) =>
      (await apiClient.post<BulkImportResult>("/leads/bulk-import", { rows })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Leads imported");
    },
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateLeadInput) => (await apiClient.post<Lead>("/leads", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead created");
    },
  });
}

export function useAssignableLeadOwners() {
  return useQuery({
    queryKey: ["leads", "assignable-owners"],
    queryFn: async () =>
      (await apiClient.get<{ id: string; firstName: string; lastName: string; role: { name: string; key: string } }[]>(
        "/leads/assignable-owners",
      )).data,
  });
}

export function useAssignLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ownerId }: { id: string; ownerId: string }) =>
      (await apiClient.post<Lead>(`/leads/${id}/assign`, { ownerId })).data,
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads", id] });
      queryClient.invalidateQueries({ queryKey: ["sales-ops"] });
      toast.success("Lead assigned");
    },
  });
}

export function useBulkAssignLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { leadIds: string[]; ownerId?: string; mode?: "single" | "round_robin" }) =>
      (await apiClient.post<{ assigned: number }>("/leads/bulk-assign", input)).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["sales-ops"] });
      toast.success(`Assigned ${data.assigned} lead${data.assigned === 1 ? "" : "s"}`);
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CreateLeadInput> & { internalNotes?: string } }) =>
      (await apiClient.patch<Lead>(`/leads/${id}`, input)).data,
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads", id] });
      toast.success("Lead updated");
    },
  });
}

export function useConvertLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estimatedValue }: { id: string; estimatedValue: number }) =>
      (await apiClient.post(`/leads/${id}/convert`, { estimatedValue })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead converted to opportunity");
    },
  });
}

export const DISQUALIFY_REASONS = ["BUDGET", "TIMING", "NO_AUTHORITY", "NOT_INTERESTED", "COMPETITOR", "OTHER"] as const;

export function useDisqualifyLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason, note }: { id: string; reason: string; note?: string }) =>
      (await apiClient.post<Lead>(`/leads/${id}/disqualify`, { reason, note })).data,
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads", id] });
      toast.success("Lead disqualified");
    },
  });
}

export const LEAD_SOURCES = [
  "WEBSITE",
  "REFERRAL",
  "COLD_CALL",
  "EXHIBITION",
  "PARTNER",
  "SOCIAL_MEDIA",
  "EMAIL_CAMPAIGN",
  "INBOUND_CALL",
  "OTHER",
];

export const INDUSTRIES = [
  "RETAIL",
  "LUXURY",
  "FASHION",
  "HEALTHCARE",
  "PHARMACEUTICALS",
  "WAREHOUSING",
  "MANUFACTURING",
  "GOVERNMENT",
  "LOGISTICS",
  "EDUCATION",
  "HOSPITALITY",
  "OTHER",
];

export const STATUS_TONE: Record<Lead["status"], "slate" | "green" | "amber" | "red" | "blue"> = {
  NEW: "blue",
  CONTACTED: "amber",
  QUALIFIED: "green",
  DISQUALIFIED: "red",
  CONVERTED: "green",
};
