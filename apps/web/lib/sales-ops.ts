"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { toast } from "./toast";

export function useCoordinatorWorklist() {
  return useQuery({
    queryKey: ["sales-ops", "worklist"],
    queryFn: async () => (await apiClient.get<any>("/sales-ops/worklist")).data,
    staleTime: 30_000,
  });
}

export function useHandoffs() {
  return useQuery({
    queryKey: ["sales-ops", "handoffs"],
    queryFn: async () => (await apiClient.get<any[]>("/sales-ops/handoffs")).data,
    staleTime: 30_000,
  });
}

export function useHygiene() {
  return useQuery({
    queryKey: ["sales-ops", "hygiene"],
    queryFn: async () => (await apiClient.get<any>("/sales-ops/hygiene")).data,
  });
}

export function useCoordinatorMetrics() {
  return useQuery({
    queryKey: ["sales-ops", "metrics"],
    queryFn: async () => (await apiClient.get<any>("/sales-ops/metrics")).data,
  });
}

export function useLeadOpsSettings() {
  return useQuery({
    queryKey: ["sales-ops", "settings"],
    queryFn: async () => (await apiClient.get<any>("/sales-ops/settings")).data,
  });
}

export function useUpdateLeadOpsSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { leadAssignMode?: string; leadSlaHours?: number; quoteChaseDays?: number }) =>
      (await apiClient.patch("/sales-ops/settings", input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-ops", "settings"] });
      toast.success("Lead ops settings saved");
    },
  });
}

export function useShiftHandovers() {
  return useQuery({
    queryKey: ["sales-ops", "handovers"],
    queryFn: async () => (await apiClient.get<any[]>("/sales-ops/handovers")).data,
  });
}

export function useCreateHandover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => (await apiClient.post("/sales-ops/handovers", { body })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-ops", "handovers"] });
      toast.success("Handover note saved");
    },
  });
}

export function useDealSummary(opportunityId: string) {
  return useQuery({
    queryKey: ["sales-ops", "deal-summary", opportunityId],
    queryFn: async () => (await apiClient.get<any>(`/sales-ops/deal-summary/${opportunityId}`)).data,
    enabled: !!opportunityId,
  });
}

export function useQuotationRevisions(quotationId: string) {
  return useQuery({
    queryKey: ["sales-ops", "quotation-revisions", quotationId],
    queryFn: async () => (await apiClient.get<any>(`/sales-ops/quotation-revisions/${quotationId}`)).data,
    enabled: !!quotationId,
  });
}

export function useScheduleMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      opportunityId: string;
      type: string;
      title: string;
      startAt: string;
      endAt?: string;
      ownerId?: string;
      note?: string;
    }) => (await apiClient.post("/sales-ops/schedule-meeting", input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Meeting scheduled");
    },
  });
}

export function useSnoozeFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, startAt }: { id: string; startAt: string }) =>
      (await apiClient.patch(`/calendar/${id}`, { startAt, reminderAt: startAt })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-ops", "worklist"] });
      qc.invalidateQueries({ queryKey: ["calendar"] });
      toast.success("Follow-up snoozed");
    },
  });
}
