"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, getAccessToken } from "./api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export interface ReportsSummary {
  leadFunnel: { status: string; count: number }[];
  opportunityByStage: { stage: string; count: number; value: number }[];
  revenue: { paidInvoices: number; wonOpportunities: number; total: number };
  collections: { total: number; byMonth: { month: string; amount: number }[] };
}

export function useReportsSummary(branchId?: string) {
  const query = new URLSearchParams();
  if (branchId) query.set("branchId", branchId);

  return useQuery({
    queryKey: ["reports", "summary", branchId],
    queryFn: async () => (await apiClient.get<ReportsSummary>(`/reports/summary?${query.toString()}`)).data,
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

export function useReceivablesAging(branchId?: string) {
  const query = new URLSearchParams();
  if (branchId) query.set("branchId", branchId);

  return useQuery({
    queryKey: ["reports", "receivables-aging", branchId],
    queryFn: async () => (await apiClient.get<ReceivablesAging>(`/reports/receivables-aging?${query.toString()}`)).data,
  });
}

/** Opens the branded Sales Report PDF in a new tab — same blob-fetch pattern as the quotation PDF, since a plain <a href> can't carry our Bearer token. */
export async function openReportsPdf(branchId?: string) {
  const query = new URLSearchParams();
  if (branchId) query.set("branchId", branchId);

  const token = getAccessToken();
  const res = await fetch(`${API_URL}/reports/pdf?${query.toString()}`, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error("Failed to generate PDF");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
