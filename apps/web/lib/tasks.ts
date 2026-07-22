"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { toast } from "./toast";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";

export interface AssignableUser {
  id: string;
  firstName: string;
  lastName: string;
  role: { name: string; key: string };
}

export interface EngineerTask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  project: { id: string; code: string; name: string; customer?: { id: string; name: string } };
  assignee: { id: string; firstName: string; lastName: string } | null;
  createdBy: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
}

export interface CreateTaskInput {
  title: string;
  projectId: string;
  assigneeId?: string;
  description?: string;
  dueAt?: string;
}

export const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

export const TASK_STATUS_TONE: Record<TaskStatus, "slate" | "green" | "amber" | "red"> = {
  TODO: "slate",
  IN_PROGRESS: "amber",
  BLOCKED: "red",
  DONE: "green",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
};

export function useTasks(
  params: {
    status?: string;
    projectId?: string;
    assigneeId?: string;
    mine?: boolean;
    assignedByMe?: boolean;
    search?: string;
    page?: number;
  } = {},
) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.projectId) query.set("projectId", params.projectId);
  if (params.assigneeId) query.set("assigneeId", params.assigneeId);
  if (params.mine) query.set("mine", "true");
  if (params.assignedByMe) query.set("assignedByMe", "true");
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));

  return useQuery({
    queryKey: ["tasks", params],
    queryFn: async () => apiClient.get<EngineerTask[]>(`/tasks?${query.toString()}`),
  });
}

export function useAssignableUsers() {
  return useQuery({
    queryKey: ["tasks", "assignable-users"],
    queryFn: async () => (await apiClient.get<AssignableUser[]>("/tasks/assignable-users")).data,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ["tasks", id],
    queryFn: async () => (await apiClient.get<EngineerTask>(`/tasks/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => (await apiClient.post<EngineerTask>("/tasks", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task assigned");
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CreateTaskInput> & { status?: TaskStatus } }) =>
      (await apiClient.patch<EngineerTask>(`/tasks/${id}`, input)).data,
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", vars.id] });
      if (vars.input.status === "DONE") toast.success("Task marked as done — coordinator notified");
      else toast.success("Task updated");
    },
  });
}
