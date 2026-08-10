"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { toast } from "./toast";

export type TaskStatus = "TODO" | "SEEN" | "IN_PROGRESS" | "SUBMITTED" | "BLOCKED" | "DONE";
export type TaskJobType =
  | "DELIVERY"
  | "CHEQUE_COLLECTION"
  | "DOCUMENT_PICKUP"
  | "SITE_VISIT"
  | "INSTALLATION"
  | "EXPORT_SHIPMENT"
  | "IMPORT_RECEIVING"
  | "OTHER";
export type PaymentMethod = "BANK_TRANSFER" | "CHEQUE" | "CASH" | "CARD" | "ONLINE";

export type SopSection = "preDay" | "warehouse" | "visit" | "docs" | "eod";
export type SopChecklist = Partial<Record<SopSection, Record<string, boolean>>>;
export type SopProgress = Record<SopSection, { done: number; total: number; complete: boolean }>;
export type SopItem = { key: string; label: string; requiresEvidence?: boolean };

export type SoLineAvailability = {
  lineItemId: string;
  name: string;
  qty: number;
  status: "available" | "unavailable" | "partial";
  notes?: string;
};

export type ImportReceivingDetails = {
  driverName?: string;
  driverContact?: string;
  vehicleNumber?: string;
  rackLocation?: string;
  fifoFollowed?: boolean;
  poNumber?: string;
  arrivalDate?: string;
  countedSameDay?: boolean;
  countCompletedNextDay?: boolean;
  plReturned?: boolean;
  discrepancies?: string;
  expiryNotes?: string;
  countedLines?: Array<{
    name: string;
    expectedQty?: number | null;
    countedQty?: number | null;
    notes?: string;
  }>;
};

export type PackingDetails = {
  itemCount?: number;
  items?: Array<{ name: string; weight?: number | null }>;
  pallets?: Array<{ label?: string; itemNames?: string; weight?: number | null }>;
  totalPalletWeight?: number | null;
  notes?: string;
  soAvailability?: SoLineAvailability[];
  importReceiving?: ImportReceivingDetails;
};

export interface AssignableUser {
  id: string;
  firstName: string;
  lastName: string;
  role: { name: string; key: string };
}

export interface TaskOrderLink {
  id: string;
  code: string;
  status?: string;
  totalAmount?: string | number;
  amount?: string | number;
  amountPaid?: string | number;
  currency?: string;
  poNumber?: string;
  dueDate?: string | null;
  customer?: { id: string; name: string; code?: string };
  lineItems?: Array<{
    id: string;
    quantity: string | number;
    product: { id: string; name: string; sku: string };
    allocations?: Array<{ quantity: string | number; status: string }>;
  }>;
}

export interface TaskLinkOptions {
  salesOrders: Array<{
    id: string;
    code: string;
    status: string;
    totalAmount: string | number;
    currency: string;
    customerPOId: string;
    label: string;
    customer: { id: string; name: string; code: string };
    project: { id: string; code: string; name: string } | null;
    customerPO: { id: string; code: string; poNumber: string } | null;
  }>;
  customerPos: Array<{
    id: string;
    code: string;
    poNumber: string;
    amount: string | number;
    currency: string;
    status: string;
    label: string;
    customer: { id: string; name: string; code: string };
    salesOrder: { id: string; code: string } | null;
  }>;
  invoices: Array<{
    id: string;
    code: string;
    status: string;
    totalAmount: string | number;
    amountPaid: string | number;
    currency: string;
    dueDate: string | null;
    salesOrderId: string | null;
    projectId: string | null;
    outstanding: number;
    label: string;
    customer: { id: string; name: string; code: string };
  }>;
}

export interface EngineerTask {
  id: string;
  title: string;
  description: string | null;
  jobType: TaskJobType;
  status: TaskStatus;
  dueDate: string | null;
  scheduleOrder: number | null;
  seenAt: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  completedAt: string | null;
  completionNote: string | null;
  paymentAmount: string | null;
  paymentMethod: PaymentMethod | null;
  paymentReference: string | null;
  sopChecklist?: SopChecklist;
  packingDetails?: PackingDetails | null;
  customerSignOff?: {
    name: string;
    contactPhone?: string;
    companyStampApplied?: boolean;
    stampNote?: string;
    signedAt: string;
    document: string;
    source: string;
    fileAssetId?: string;
  } | null;
  customerNotifiedAt?: string | null;
  incompleteReason?: string | null;
  rescheduleDate?: string | null;
  originalsReturnedAt?: string | null;
  sopProgress?: SopProgress;
  requiredDocs?: SopItem[];
  salesOrderId?: string | null;
  customerPoId?: string | null;
  invoiceId?: string | null;
  project: {
    id: string;
    code: string;
    name: string;
    customer?: { id: string; name: string };
    site?: {
      id: string;
      label: string;
      addressLine: string | null;
      city: string | null;
      geoLat: number | null;
      geoLng: number | null;
    } | null;
  } | null;
  salesOrder?: TaskOrderLink | null;
  customerPo?: TaskOrderLink | null;
  invoice?: TaskOrderLink | null;
  assignee: { id: string; firstName: string; lastName: string } | null;
  createdBy: { id: string; firstName: string; lastName: string } | null;
  verifiedBy: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
}

export interface FieldDayData {
  date: string;
  assigneeId: string;
  stats: {
    total: number;
    open: number;
    submitted: number;
    done: number;
    blocked: number;
    originalsPending: number;
  };
  jobs: EngineerTask[];
}

export interface SopTemplates {
  preDay: SopItem[];
  warehouse: SopItem[];
  visit: SopItem[];
  eod: SopItem[];
  docsByJobType: Record<string, SopItem[]>;
}

export interface CreateTaskInput {
  title?: string;
  projectId?: string;
  salesOrderId?: string;
  customerPoId?: string;
  invoiceId?: string;
  assigneeId?: string;
  description?: string;
  dueAt?: string;
  jobType?: TaskJobType;
  scheduleOrder?: number;
  recurrence?: { cadence: "WEEKLY" | "BIWEEKLY" | "MONTHLY"; dayOfWeek?: number };
}

export type UpdateTaskInput = Omit<
  Partial<CreateTaskInput>,
  "projectId" | "salesOrderId" | "customerPoId" | "invoiceId" | "recurrence"
> & {
  status?: TaskStatus;
  projectId?: string | null;
  salesOrderId?: string | null;
  customerPoId?: string | null;
  invoiceId?: string | null;
};

export interface SubmitTaskInput {
  completionNote: string;
  paymentAmount?: number;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  sopChecklist?: SopChecklist;
  packingDetails?: PackingDetails;
}

export interface UpdateSopInput {
  sopChecklist?: SopChecklist;
  packingDetails?: PackingDetails;
  customerNotified?: boolean;
  scheduleOrder?: number;
  reserveStock?: boolean;
  warehouseId?: string;
}

export const TASK_STATUSES: TaskStatus[] = ["TODO", "SEEN", "IN_PROGRESS", "SUBMITTED", "BLOCKED", "DONE"];

export const TASK_STATUS_TONE: Record<TaskStatus, "slate" | "green" | "amber" | "red" | "blue"> = {
  TODO: "slate",
  SEEN: "blue",
  IN_PROGRESS: "amber",
  SUBMITTED: "amber",
  BLOCKED: "red",
  DONE: "green",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "Assigned",
  SEEN: "Seen",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Awaiting verify",
  BLOCKED: "Blocked / incomplete",
  DONE: "Done",
};

export const TASK_JOB_TYPES: TaskJobType[] = [
  "DELIVERY",
  "EXPORT_SHIPMENT",
  "IMPORT_RECEIVING",
  "CHEQUE_COLLECTION",
  "DOCUMENT_PICKUP",
  "SITE_VISIT",
  "INSTALLATION",
  "OTHER",
];

export const TASK_JOB_LABELS: Record<TaskJobType, string> = {
  DELIVERY: "Customer delivery",
  EXPORT_SHIPMENT: "Export shipment",
  IMPORT_RECEIVING: "Import receiving",
  CHEQUE_COLLECTION: "Cheque / payment collection",
  DOCUMENT_PICKUP: "Document pickup",
  SITE_VISIT: "Site visit",
  INSTALLATION: "Installation",
  OTHER: "Other",
};

export const SOP_SECTION_LABELS: Record<SopSection, string> = {
  preDay: "Before starting the day",
  warehouse: "Warehouse activities",
  visit: "Customer visit",
  docs: "Document submission",
  eod: "End of day",
};

export function useTasks(
  params: {
    status?: string;
    jobType?: string;
    projectId?: string;
    assigneeId?: string;
    mine?: boolean;
    assignedByMe?: boolean;
    awaitingVerify?: boolean;
    search?: string;
    page?: number;
  } = {},
) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.jobType) query.set("jobType", params.jobType);
  if (params.projectId) query.set("projectId", params.projectId);
  if (params.assigneeId) query.set("assigneeId", params.assigneeId);
  if (params.mine) query.set("mine", "true");
  if (params.assignedByMe) query.set("assignedByMe", "true");
  if (params.awaitingVerify) query.set("awaitingVerify", "true");
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));

  return useQuery({
    queryKey: ["tasks", params],
    queryFn: async () => apiClient.get<EngineerTask[]>(`/tasks?${query.toString()}`),
  });
}

export function useFieldDay(params: { date?: string; assigneeId?: string; mine?: boolean } = {}) {
  const query = new URLSearchParams();
  if (params.date) query.set("date", params.date);
  if (params.assigneeId) query.set("assigneeId", params.assigneeId);
  if (params.mine !== false) query.set("mine", "true");
  return useQuery({
    queryKey: ["tasks", "field-day", params],
    queryFn: async () => (await apiClient.get<FieldDayData>(`/tasks/field-day?${query.toString()}`)).data,
  });
}

export function useReorderFieldDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { date?: string; orderedIds: string[] }) =>
      (await apiClient.post<FieldDayData>("/tasks/field-day/reorder", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "field-day"] });
      toast.success("Visit order updated");
    },
  });
}

export function useSopTemplates() {
  return useQuery({
    queryKey: ["tasks", "sop-templates"],
    queryFn: async () => (await apiClient.get<SopTemplates>("/tasks/sop-templates")).data,
    staleTime: 60_000,
  });
}

export function useAssignableUsers() {
  return useQuery({
    queryKey: ["tasks", "assignable-users"],
    queryFn: async () => (await apiClient.get<AssignableUser[]>("/tasks/assignable-users")).data,
  });
}

export function useTaskLinkOptions() {
  return useQuery({
    queryKey: ["tasks", "link-options"],
    queryFn: async () => (await apiClient.get<TaskLinkOptions>("/tasks/link-options")).data,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ["tasks", id],
    queryFn: async () => (await apiClient.get<EngineerTask>(`/tasks/${id}`)).data,
    enabled: !!id,
  });
}

function invalidateTask(qc: ReturnType<typeof useQueryClient>, id?: string) {
  qc.invalidateQueries({ queryKey: ["tasks"] });
  if (id) qc.invalidateQueries({ queryKey: ["tasks", id] });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => (await apiClient.post<EngineerTask>("/tasks", input)).data,
    onSuccess: () => {
      invalidateTask(queryClient);
      toast.success("Job assigned");
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      (await apiClient.patch<EngineerTask>(`/tasks/${id}`, input)).data,
    onSuccess: (_data, vars) => {
      invalidateTask(queryClient, vars.id);
      toast.success("Task updated");
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.del<{ id: string }>(`/tasks/${id}`)).data,
    onSuccess: () => {
      invalidateTask(queryClient);
      toast.success("Job deleted");
    },
  });
}

export function useUpdateTaskSop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateSopInput }) =>
      (await apiClient.patch<EngineerTask>(`/tasks/${id}/sop`, input)).data,
    onSuccess: (_data, vars) => {
      invalidateTask(queryClient, vars.id);
      toast.success("SOP checklist saved");
    },
  });
}

export async function openPackingSlipPdf(id: string) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
  const { getAccessToken } = await import("./api-client");
  const res = await fetch(`${API_URL}/tasks/${id}/packing-slip.pdf`, {
    headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
  });
  if (!res.ok) throw new Error("Failed to open packing slip PDF");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
}

export function useAcknowledgeTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.post<EngineerTask>(`/tasks/${id}/acknowledge`)).data,
    onSuccess: (_data, id) => {
      invalidateTask(queryClient, id);
      toast.success("Marked as seen — coordinator notified");
    },
  });
}

export function useSubmitTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: SubmitTaskInput }) =>
      (await apiClient.post<EngineerTask>(`/tasks/${id}/submit`, input)).data,
    onSuccess: (_data, vars) => {
      invalidateTask(queryClient, vars.id);
      toast.success("Submitted for coordinator verification");
    },
  });
}

export function useReportIncomplete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason, rescheduleDate }: { id: string; reason: string; rescheduleDate?: string }) =>
      (await apiClient.post<EngineerTask>(`/tasks/${id}/report-incomplete`, { reason, rescheduleDate })).data,
    onSuccess: (_data, vars) => {
      invalidateTask(queryClient, vars.id);
      toast.success("Coordinator notified — job marked incomplete");
    },
  });
}

export function useReturnOriginals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.post<EngineerTask>(`/tasks/${id}/return-originals`)).data,
    onSuccess: (_data, id) => {
      invalidateTask(queryClient, id);
      toast.success("Originals marked returned to office");
    },
  });
}

export function useReturnOriginalsForDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { date?: string; mine?: boolean; assigneeId?: string } = {}) =>
      (
        await apiClient.post<{ date: string; assigneeId: string; count: number; ids: string[] }>(
          "/tasks/return-originals-day",
          input,
        )
      ).data,
    onSuccess: (data) => {
      invalidateTask(queryClient);
      toast.success(
        data.count === 0
          ? "No done jobs waiting on originals"
          : `Originals returned for ${data.count} job${data.count === 1 ? "" : "s"}`,
      );
    },
  });
}

export function useTaskSignOff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: {
        name: string;
        document: "DO" | "INVOICE" | "BOTH";
        signatureDataUrl?: string;
        contactPhone: string;
        companyStampApplied?: boolean;
        stampNote?: string;
      };
    }) => (await apiClient.post<EngineerTask>(`/tasks/${id}/sign-off`, input)).data,
    onSuccess: (_data, vars) => {
      invalidateTask(queryClient, vars.id);
      toast.success("Customer signature saved");
    },
  });
}

export function useVerifyTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) =>
      (await apiClient.post<EngineerTask>(`/tasks/${id}/verify`, { note })).data,
    onSuccess: (_data, vars) => {
      invalidateTask(queryClient, vars.id);
      toast.success("Job verified & closed");
    },
  });
}

export type SopComplianceIssue = "missingScans" | "incompleteChecklist" | "originalsPending" | "urgentStock" | "blocked" | "any";

export type SopComplianceJob = {
  id: string;
  title: string;
  jobType: TaskJobType;
  status: TaskStatus;
  dueDate: string | null;
  scheduleOrder: number | null;
  seenAt: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  completedAt: string | null;
  originalsReturnedAt: string | null;
  customerNotifiedAt: string | null;
  incompleteReason: string | null;
  rescheduleDate: string | null;
  paymentAmount: string | null;
  paymentMethod: PaymentMethod | null;
  paymentReference: string | null;
  completionNote: string | null;
  project: {
    id: string;
    code: string;
    name: string;
    customer: { id: string; name: string } | null;
  } | null;
  assignee: { id: string; firstName: string; lastName: string; email: string } | null;
  createdBy: { id: string; firstName: string; lastName: string; email: string } | null;
  verifiedBy: { id: string; firstName: string; lastName: string } | null;
  attachmentCount: number;
  missingDocLabels: string[];
  progress: SopProgress;
  checklistPct: number;
  issues: {
    missingScans: boolean;
    incompleteChecklist: boolean;
    originalsPending: boolean;
    urgentStock: boolean;
    blocked: boolean;
  };
  issueCount: number;
  updatedAt: string;
  createdAt: string;
};

export type SopComplianceData = {
  filters: {
    date: string | null;
    days: number;
    assigneeId: string | null;
    jobType: string | null;
    issue: SopComplianceIssue;
  };
  summary: {
    totalJobs: number;
    withIssues: number;
    compliantJobs: number;
    compliancePct: number;
    missingScans: number;
    incompleteChecklist: number;
    originalsPending: number;
    urgentStock: number;
    blocked: number;
    avgChecklistPct: number;
    submittedAwaitingVerify: number;
  };
  jobs: SopComplianceJob[];
};

export function useSopCompliance(params: {
  date?: string;
  days?: number;
  assigneeId?: string;
  jobType?: string;
  issue?: SopComplianceIssue;
}) {
  const q = new URLSearchParams();
  if (params.date) q.set("date", params.date);
  if (params.days) q.set("days", String(params.days));
  if (params.assigneeId) q.set("assigneeId", params.assigneeId);
  if (params.jobType) q.set("jobType", params.jobType);
  if (params.issue) q.set("issue", params.issue);
  return useQuery({
    queryKey: ["tasks", "sop-compliance", params],
    queryFn: async () => (await apiClient.get<SopComplianceData>(`/tasks/sop-compliance?${q}`)).data,
    staleTime: 20_000,
  });
}
