"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";

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

export function useLeads(params: { status?: string; search?: string; page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateLeadInput) => (await apiClient.post<Lead>("/leads", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export function useConvertLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estimatedValue }: { id: string; estimatedValue: number }) =>
      (await apiClient.post(`/leads/${id}/convert`, { estimatedValue })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
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
