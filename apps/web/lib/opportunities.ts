"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { toast } from "./toast";

export const OPPORTUNITY_STAGES = [
  "REQUIREMENT_GATHERING",
  "SITE_SURVEY",
  "TECHNICAL_DISCUSSION",
  "DEMO",
  "POC",
  "SOLUTION_DESIGN",
  "INTERNAL_REVIEW",
  "QUOTATION_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;

export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];

export const LOSS_REASONS = ["PRICE", "COMPETITOR", "TIMING", "BUDGET", "NO_DECISION", "TECHNICAL_FIT", "OTHER"];

export const STAGE_TONE: Record<OpportunityStage, "slate" | "green" | "amber" | "red" | "blue"> = {
  REQUIREMENT_GATHERING: "slate",
  SITE_SURVEY: "slate",
  TECHNICAL_DISCUSSION: "blue",
  DEMO: "blue",
  POC: "blue",
  SOLUTION_DESIGN: "amber",
  INTERNAL_REVIEW: "amber",
  QUOTATION_SENT: "amber",
  NEGOTIATION: "amber",
  WON: "green",
  LOST: "red",
};

export interface OpportunityStageHistoryEntry {
  id: string;
  fromStage: OpportunityStage | null;
  toStage: OpportunityStage;
  changedById: string | null;
  enteredAt: string;
  isRegression: boolean;
}

export interface Opportunity {
  id: string;
  code: string;
  title: string;
  customerId: string;
  customer: { id: string; code: string; name: string } | null;
  owner: { id: string; firstName: string; lastName: string } | null;
  stage: OpportunityStage;
  probability: number;
  estimatedValue: string;
  currency: string;
  expectedCloseDate: string | null;
  lossReason: string | null;
  lossNote: string | null;
  competitor: string | null;
  internalNotes?: string | null;
  wonAt: string | null;
  lostAt: string | null;
  createdAt: string;
  stageHistory?: OpportunityStageHistoryEntry[];
  quotations?: Array<{ id: string; code: string; status: string; grandTotal: string; currency: string }>;
}

export interface CreateOpportunityInput {
  title: string;
  customerId: string;
  estimatedValue: number;
  currency?: string;
  expectedCloseDate?: string;
}

export interface ChangeStageInput {
  stage: OpportunityStage;
  lossReason?: string;
  lossNote?: string;
  competitor?: string;
}

export function useOpportunities(
  params: { stage?: string; search?: string; customerId?: string; page?: number; pageSize?: number } = {},
) {
  const query = new URLSearchParams();
  if (params.stage) query.set("stage", params.stage);
  if (params.search) query.set("search", params.search);
  if (params.customerId) query.set("customerId", params.customerId);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  return useQuery({
    queryKey: ["opportunities", params],
    queryFn: async () => apiClient.get<Opportunity[]>(`/opportunities?${query.toString()}`),
  });
}

export function useOpportunity(id: string) {
  return useQuery({
    queryKey: ["opportunities", id],
    queryFn: async () => (await apiClient.get<Opportunity>(`/opportunities/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOpportunityInput) => (await apiClient.post<Opportunity>("/opportunities", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Saved");
    },
  });
}

export function useUpdateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: Partial<CreateOpportunityInput> & { competitor?: string; internalNotes?: string };
    }) => (await apiClient.patch<Opportunity>(`/opportunities/${id}`, input)).data,
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities", vars.id] });
      toast.success("Deal updated");
    },
  });
}

export function useChangeOpportunityStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ChangeStageInput }) =>
      (await apiClient.post<Opportunity>(`/opportunities/${id}/stage`, input)).data,
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities", vars.id] });
    },
  });
}
