"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { Project } from "./projects";

export function useInstallations(params: { customerId?: string; search?: string; page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.customerId) query.set("customerId", params.customerId);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));

  return useQuery({
    queryKey: ["installations", params],
    queryFn: async () => apiClient.get<Project[]>(`/installations?${query.toString()}`),
  });
}
