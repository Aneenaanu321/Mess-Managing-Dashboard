"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";

export type TicketPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type TicketStatus = "NEW" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "REOPENED" | "ESCALATED";

export interface TicketComment {
  id: string;
  body: string;
  isInternal: boolean;
  authorId: string | null;
  createdAt: string;
}

export interface Ticket {
  id: string;
  code: string;
  subject: string;
  description: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  customer: { id: string; code: string; name: string };
  device: { id: string; serialNumber: string; type: string } | null;
  raisedBy: { id: string; firstName: string; lastName: string } | null;
  assignee: { id: string; firstName: string; lastName: string } | null;
  slaResponseDueAt: string | null;
  slaResolutionDueAt: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  reopenCount: number;
  comments?: TicketComment[];
  createdAt: string;
}

export interface CreateTicketInput {
  subject: string;
  description?: string;
  priority: TicketPriority;
  customerId: string;
  deviceId?: string;
}

export const TICKET_PRIORITIES: TicketPriority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
export const TICKET_STATUSES: TicketStatus[] = ["NEW", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REOPENED", "ESCALATED"];

export const TICKET_STATUS_TONE: Record<TicketStatus, "slate" | "green" | "amber" | "red" | "blue"> = {
  NEW: "blue",
  ASSIGNED: "blue",
  IN_PROGRESS: "amber",
  RESOLVED: "green",
  CLOSED: "slate",
  REOPENED: "red",
  ESCALATED: "red",
};

export const TICKET_PRIORITY_TONE: Record<TicketPriority, "slate" | "green" | "amber" | "red"> = {
  CRITICAL: "red",
  HIGH: "red",
  MEDIUM: "amber",
  LOW: "slate",
};

export function useTickets(params: { status?: string; priority?: string; customerId?: string; search?: string; page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.priority) query.set("priority", params.priority);
  if (params.customerId) query.set("customerId", params.customerId);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));

  return useQuery({
    queryKey: ["tickets", params],
    queryFn: async () => apiClient.get<Ticket[]>(`/support?${query.toString()}`),
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ["tickets", id],
    queryFn: async () => (await apiClient.get<Ticket>(`/support/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTicketInput) => (await apiClient.post<Ticket>("/support", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: { status?: TicketStatus; priority?: TicketPriority; assigneeId?: string; resolutionNote?: string };
    }) => (await apiClient.patch<Ticket>(`/support/${id}`, input)).data,
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["tickets", vars.id] });
    },
  });
}

export function useAddTicketComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body, isInternal }: { id: string; body: string; isInternal?: boolean }) =>
      (await apiClient.post<TicketComment>(`/support/${id}/comments`, { body, isInternal: isInternal ?? false })).data,
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["tickets", vars.id] });
    },
  });
}
