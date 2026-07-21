"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";

export type CalendarEventType = "FOLLOW_UP" | "MEETING" | "SITE_VISIT" | "DEMO" | "INSTALLATION" | "TRAINING" | "OTHER";

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  startAt: string;
  endAt: string | null;
  completedAt: string | null;
  reminderAt: string | null;
  opportunity: { id: string; code: string; title: string } | null;
  owner: { id: string; firstName: string; lastName: string };
}

export interface CreateCalendarEventInput {
  type: CalendarEventType;
  title: string;
  startAt: string;
  endAt?: string;
  opportunityId?: string;
  reminderAt?: string;
}

export function useCalendarEvents(params: { includeCompleted?: boolean } = {}) {
  const query = new URLSearchParams();
  if (params.includeCompleted) query.set("includeCompleted", "true");

  return useQuery({
    queryKey: ["calendar", params],
    queryFn: async () => (await apiClient.get<CalendarEvent[]>(`/calendar?${query.toString()}`)).data,
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCalendarEventInput) => (await apiClient.post<CalendarEvent>("/calendar", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar"] }),
  });
}

export function useCompleteCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.patch<CalendarEvent>(`/calendar/${id}`, { completed: true })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar"] }),
  });
}

export const CALENDAR_EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  FOLLOW_UP: "Follow-up",
  MEETING: "Meeting",
  SITE_VISIT: "Site Visit",
  DEMO: "Demo",
  INSTALLATION: "Installation",
  TRAINING: "Training",
  OTHER: "Other",
};
