"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";

export type AmcStatus = "ACTIVE" | "EXPIRING_SOON" | "LAPSED" | "RENEWED" | "CANCELLED";

export interface AmcContractDevice {
  id: string;
  device: { id: string; serialNumber: string; type: string };
}

export interface AmcContract {
  id: string;
  code: string;
  status: AmcStatus;
  currency: string;
  contractValue: string;
  startDate: string;
  endDate: string;
  daysToExpiry: number;
  expiringSoon: boolean;
  customer: { id: string; code: string; name: string };
  devices?: AmcContractDevice[];
  createdAt: string;
}

export interface CreateAmcContractInput {
  customerId: string;
  startDate: string;
  endDate: string;
  annualValue: number;
  deviceIds?: string[];
}

export const AMC_STATUSES: AmcStatus[] = ["ACTIVE", "EXPIRING_SOON", "LAPSED", "RENEWED", "CANCELLED"];

export const AMC_STATUS_TONE: Record<AmcStatus, "slate" | "green" | "amber" | "red" | "blue"> = {
  ACTIVE: "green",
  EXPIRING_SOON: "amber",
  LAPSED: "red",
  RENEWED: "blue",
  CANCELLED: "slate",
};

export function useAmcContracts(params: { status?: string; customerId?: string; expiringOnly?: boolean; search?: string; page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.customerId) query.set("customerId", params.customerId);
  if (params.expiringOnly) query.set("expiringOnly", "true");
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));

  return useQuery({
    queryKey: ["amc", params],
    queryFn: async () => apiClient.get<AmcContract[]>(`/amc?${query.toString()}`),
  });
}

export function useAmcContract(id: string) {
  return useQuery({
    queryKey: ["amc", id],
    queryFn: async () => (await apiClient.get<AmcContract>(`/amc/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateAmcContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAmcContractInput) => (await apiClient.post<AmcContract>("/amc", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["amc"] }),
  });
}

export function useUpdateAmcContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: { status?: AmcStatus; endDate?: string; annualValue?: number } }) =>
      (await apiClient.patch<AmcContract>(`/amc/${id}`, input)).data,
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["amc"] });
      queryClient.invalidateQueries({ queryKey: ["amc", vars.id] });
    },
  });
}
