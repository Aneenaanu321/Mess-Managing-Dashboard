"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";

export interface Campaign {
  id: string;
  name: string;
  channel: string;
  startDate: string | null;
  endDate: string | null;
  budget: string | null;
  createdAt: string;
  _count?: { leads: number };
  leads?: { id: string; code: string; companyName: string; status: string }[];
}

export interface CreateCampaignInput {
  name: string;
  channel: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
}

export function useCampaigns(params: { search?: string } = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);

  return useQuery({
    queryKey: ["campaigns", params],
    queryFn: async () => apiClient.get<Campaign[]>(`/campaigns?${query.toString()}`),
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ["campaigns", id],
    queryFn: async () => (await apiClient.get<Campaign>(`/campaigns/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCampaignInput) => (await apiClient.post<Campaign>("/campaigns", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}
