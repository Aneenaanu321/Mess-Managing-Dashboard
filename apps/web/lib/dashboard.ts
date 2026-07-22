"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./api-client";

export interface ExecutiveSummary {
  leadCount: number;
  unassignedLeadCount: number;
  newLeadCount7d: number;
  openOpportunityCount: number;
  pipelineValue: number;
  wonOpportunityCount: number;
  quotationCount: number;
  pendingApprovalCount: number;
  openProjectCount: number;
  openTicketCount: number;
  overdueInvoiceCount: number;
  amcExpiringSoonCount: number;
  upcomingEventCount: number;
}

export interface DashboardSpotlight {
  recentLeads: Array<{
    id: string;
    code: string;
    companyName: string;
    contactName: string;
    status: string;
    score: number;
    createdAt: string;
  }>;
  topOpportunities: Array<{
    id: string;
    code: string;
    title: string;
    stage: string;
    estimatedValue: number;
    currency: string;
    customerName: string | null;
  }>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    type: string;
    startAt: string;
    opportunityCode: string | null;
  }>;
  pendingApprovals: Array<{
    id: string;
    reason: string | null;
    requestedAt: string;
    quotationCode: string | null;
    customerName: string | null;
    grandTotal: number | null;
    currency: string | null;
  }>;
  expiringAmcs: Array<{
    id: string;
    code: string;
    customerName: string | null;
    endDate: string;
    contractValue: number;
    currency: string;
    daysToExpiry: number;
  }>;
}

export function useExecutiveSummary(branchId?: string) {
  const query = new URLSearchParams();
  if (branchId) query.set("branchId", branchId);

  return useQuery({
    queryKey: ["dashboard", "summary", branchId],
    queryFn: async () => (await apiClient.get<ExecutiveSummary>(`/dashboard/summary?${query.toString()}`)).data,
  });
}

export function useDashboardSpotlight(branchId?: string) {
  const query = new URLSearchParams();
  if (branchId) query.set("branchId", branchId);

  return useQuery({
    queryKey: ["dashboard", "spotlight", branchId],
    queryFn: async () => (await apiClient.get<DashboardSpotlight>(`/dashboard/spotlight?${query.toString()}`)).data,
  });
}
