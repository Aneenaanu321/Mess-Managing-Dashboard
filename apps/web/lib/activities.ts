"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { toast } from "./toast";

export type ActivityType = "CALL" | "EMAIL" | "MEETING" | "NOTE" | "SITE_VISIT" | "DOCUMENT" | "OTHER";

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  body: string | null;
  durationMins?: number | null;
  occurredAt: string;
  actor: { id: string; firstName: string; lastName: string } | null;
}

export type ActivityScope = { leadId: string } | { customerId: string } | { opportunityId: string };

function scopeQuery(scope: ActivityScope) {
  const query = new URLSearchParams();
  if ("leadId" in scope) query.set("leadId", scope.leadId);
  if ("customerId" in scope) query.set("customerId", scope.customerId);
  if ("opportunityId" in scope) query.set("opportunityId", scope.opportunityId);
  return query;
}

export function useActivities(scope: ActivityScope) {
  const query = scopeQuery(scope);
  return useQuery({
    queryKey: ["activities", scope],
    queryFn: async () => (await apiClient.get<Activity[]>(`/activities?${query.toString()}`)).data,
  });
}

export function useCreateActivity(scope: ActivityScope) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { type: ActivityType; subject: string; body?: string; durationMins?: number }) =>
      (await apiClient.post<Activity>("/activities", { ...input, ...scope })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", scope] });
      toast.success("Saved");
    },
  });
}

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  NOTE: "Note",
  SITE_VISIT: "Site Visit",
  DOCUMENT: "Document",
  OTHER: "Other",
};
