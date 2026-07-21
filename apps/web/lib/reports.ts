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

export type AgingBucket = "CURRENT" | "DAYS_1_30" | "DAYS_31_60" | "DAYS_61_90" | "DAYS_90_PLUS";

export interface ReceivablesAging {
  buckets: Record<AgingBucket, number>;
  invoices: {
    id: string;
    code: string;
    customerName: string;
    currency: string;
    balance: number;
    dueDate: string;
    daysOverdue: number;
    bucket: AgingBucket;
  }[];
}

export function useReceivablesAging() {
  return useQuery({
    queryKey: ["reports", "receivables-aging"],
    queryFn: async () => (await apiClient.get<ReceivablesAging>("/reports/receivables-aging")).data,
  });
}
