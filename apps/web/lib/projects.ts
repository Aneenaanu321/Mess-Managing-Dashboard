"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { toast } from "./toast";

export type ProjectStatus =
  | "CREATED"
  | "ENGINEER_ASSIGNED"
  | "INSTALLATION_IN_PROGRESS"
  | "INSTALLATION_COMPLETE"
  | "CONFIGURATION_COMPLETE"
  | "TESTING_COMPLETE"
  | "TRAINING_COMPLETE"
  | "GO_LIVE"
  | "CLOSED"
  | "ON_HOLD";

export type MilestoneKey = "ENGINEER_ASSIGNMENT" | "INSTALLATION" | "CONFIGURATION" | "TESTING" | "TRAINING" | "GO_LIVE";
export type MilestoneStatus = "PENDING" | "IN_PROGRESS" | "COMPLETE" | "BLOCKED";

export interface ProjectMilestone {
  id: string;
  key: MilestoneKey;
  status: MilestoneStatus;
  ownerId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  customer: { id: string; code: string; name: string };
  site: { id: string; label: string } | null;
  opportunity: { id: string; code: string; title: string } | null;
  salesOrder: { id: string; code: string };
  manager: { id: string; firstName: string; lastName: string } | null;
  plannedGoLiveDate: string | null;
  actualGoLiveDate: string | null;
  milestones: ProjectMilestone[];
  tasks?: { id: string; title: string; status: string }[];
  devices?: { id: string; serialNumber: string; type: string; status: string }[];
  createdAt: string;
}

export interface CreateProjectInput {
  name: string;
  customerId: string;
  siteId?: string;
  opportunityId?: string;
  salesOrderId: string;
  managerId?: string;
  plannedGoLiveDate?: string;
}

export const PROJECT_STATUSES: ProjectStatus[] = [
  "CREATED",
  "ENGINEER_ASSIGNED",
  "INSTALLATION_IN_PROGRESS",
  "INSTALLATION_COMPLETE",
  "CONFIGURATION_COMPLETE",
  "TESTING_COMPLETE",
  "TRAINING_COMPLETE",
  "GO_LIVE",
  "CLOSED",
  "ON_HOLD",
];

export const MILESTONE_LABELS: Record<MilestoneKey, string> = {
  ENGINEER_ASSIGNMENT: "Engineer Assignment",
  INSTALLATION: "Installation",
  CONFIGURATION: "Configuration",
  TESTING: "Testing",
  TRAINING: "Training",
  GO_LIVE: "Go-Live",
};

export const STATUS_TONE: Record<ProjectStatus, "slate" | "green" | "amber" | "red" | "blue"> = {
  CREATED: "slate",
  ENGINEER_ASSIGNED: "blue",
  INSTALLATION_IN_PROGRESS: "amber",
  INSTALLATION_COMPLETE: "amber",
  CONFIGURATION_COMPLETE: "amber",
  TESTING_COMPLETE: "amber",
  TRAINING_COMPLETE: "amber",
  GO_LIVE: "green",
  CLOSED: "green",
  ON_HOLD: "red",
};

export const MILESTONE_STATUS_TONE: Record<MilestoneStatus, "slate" | "green" | "amber" | "red"> = {
  PENDING: "slate",
  IN_PROGRESS: "amber",
  COMPLETE: "green",
  BLOCKED: "red",
};

export function useProjects(params: { status?: string; customerId?: string; search?: string; page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.customerId) query.set("customerId", params.customerId);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));

  return useQuery({
    queryKey: ["projects", params],
    queryFn: async () => apiClient.get<Project[]>(`/projects?${query.toString()}`),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: async () => (await apiClient.get<Project>(`/projects/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProjectInput) => (await apiClient.post<Project>("/projects", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Saved");
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CreateProjectInput> & { status?: ProjectStatus } }) =>
      (await apiClient.patch<Project>(`/projects/${id}`, input)).data,
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", vars.id] });
    },
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      milestoneId,
      input,
    }: {
      projectId: string;
      milestoneId: string;
      input: { status?: MilestoneStatus; notes?: string };
    }) => (await apiClient.patch(`/projects/${projectId}/milestones/${milestoneId}`, input)).data,
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["projects", vars.projectId] });
    },
  });
}
