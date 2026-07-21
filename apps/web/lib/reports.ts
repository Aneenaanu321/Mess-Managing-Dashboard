"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./api-client";

export interface ReportsSummary {
  leadFunnel: { status: string; count: number }[];
  opportunityByStage: { stage: string; count: number; value: number }[];
  revenue: { paidInvoices: number; wonOpportunities: number; total: number };
  collections: { total: number; byMonth: { month: string; amount: number }[] };
}

export function useReportsSummary() {
  return useQuery({
    queryKey: ["reports", "summary"],
    queryFn: async () => (await apiClient.get<ReportsSummary>("/reports/summary")).data,
  });
}
