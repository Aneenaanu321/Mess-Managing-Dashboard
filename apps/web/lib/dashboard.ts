"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./api-client";

export interface ExecutiveSummary {
  leadCount: number;
  openOpportunityCount: number;
  pipelineValue: number;
  quotationCount: number;
  openProjectCount: number;
  openTicketCount: number;
  overdueInvoiceCount: number;
  amcExpiringSoonCount: number;
}

export function useExecutiveSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => (await apiClient.get<ExecutiveSummary>("/dashboard/summary")).data,
  });
}
