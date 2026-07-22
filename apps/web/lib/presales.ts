"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { toast } from "./toast";

export interface SiteSurvey {
  id: string;
  surveyDate: string;
  findings: string | null;
}
export interface DemoRecord {
  id: string;
  demoDate: string;
  productsShown: string | null;
  outcome: string | null;
}
export interface PocRecord {
  id: string;
  startDate: string;
  endDate: string | null;
  scope: string | null;
  outcome: string | null;
}
export interface SolutionDesign {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
}

function useList<T>(kind: string, opportunityId: string) {
  return useQuery({
    queryKey: ["presales", kind, opportunityId],
    queryFn: async () => (await apiClient.get<T[]>(`/presales/${kind}?opportunityId=${opportunityId}`)).data,
    enabled: !!opportunityId,
  });
}

function useCreate<TInput extends object>(kind: string, opportunityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TInput) => (await apiClient.post(`/presales/${kind}`, { ...input, opportunityId })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presales", kind, opportunityId] });
      toast.success("Saved");
    },
  });
}

export const useSiteSurveys = (opportunityId: string) => useList<SiteSurvey>("site-surveys", opportunityId);
export const useCreateSiteSurvey = (opportunityId: string) =>
  useCreate<{ surveyDate: string; findings?: string }>("site-surveys", opportunityId);

export const useDemos = (opportunityId: string) => useList<DemoRecord>("demos", opportunityId);
export const useCreateDemo = (opportunityId: string) =>
  useCreate<{ demoDate: string; productsShown?: string; outcome?: string }>("demos", opportunityId);

export const usePocs = (opportunityId: string) => useList<PocRecord>("pocs", opportunityId);
export const useCreatePoc = (opportunityId: string) =>
  useCreate<{ startDate: string; endDate?: string; scope?: string; outcome?: string }>("pocs", opportunityId);

export const useSolutionDesigns = (opportunityId: string) => useList<SolutionDesign>("solution-designs", opportunityId);
export const useCreateSolutionDesign = (opportunityId: string) =>
  useCreate<{ title: string; description?: string }>("solution-designs", opportunityId);
