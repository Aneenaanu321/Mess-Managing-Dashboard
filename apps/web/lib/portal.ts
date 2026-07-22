"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";

type Tone = "slate" | "green" | "amber" | "red" | "blue";

export const QUOTATION_STATUS_TONE: Record<string, Tone> = {
  DRAFT: "slate",
  PENDING_APPROVAL: "amber",
  APPROVED_INTERNAL: "blue",
  SENT: "blue",
  CUSTOMER_APPROVED: "green",
  CUSTOMER_REJECTED: "red",
  REVISION_REQUESTED: "amber",
  SUPERSEDED: "slate",
  EXPIRED: "red",
};

export const PO_STATUS_TONE: Record<string, Tone> = {
  RECEIVED: "blue",
  VERIFIED: "green",
  DISPUTED: "red",
  CANCELLED: "slate",
};

export const PROJECT_STATUS_TONE: Record<string, Tone> = {
  CREATED: "slate",
  ENGINEER_ASSIGNED: "blue",
  INSTALLATION_IN_PROGRESS: "blue",
  INSTALLATION_COMPLETE: "blue",
  CONFIGURATION_COMPLETE: "blue",
  TESTING_COMPLETE: "blue",
  TRAINING_COMPLETE: "blue",
  GO_LIVE: "green",
  CLOSED: "green",
  ON_HOLD: "amber",
};

export const MILESTONE_STATUS_TONE: Record<string, Tone> = {
  PENDING: "slate",
  IN_PROGRESS: "blue",
  COMPLETE: "green",
  BLOCKED: "red",
};

export const INVOICE_STATUS_TONE: Record<string, Tone> = {
  DRAFT: "slate",
  SENT: "blue",
  PARTIALLY_PAID: "amber",
  PAID: "green",
  OVERDUE: "red",
  CANCELLED: "slate",
};

export const TICKET_STATUS_TONE: Record<string, Tone> = {
  NEW: "blue",
  ASSIGNED: "blue",
  IN_PROGRESS: "amber",
  RESOLVED: "green",
  CLOSED: "green",
  REOPENED: "red",
  ESCALATED: "red",
};

export const TICKET_PRIORITY_TONE: Record<string, Tone> = {
  CRITICAL: "red",
  HIGH: "amber",
  MEDIUM: "blue",
  LOW: "slate",
};

export interface PortalQuotationLine {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}
export interface PortalQuotation {
  id: string;
  code: string;
  version: number;
  status: string;
  currency: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  grandTotal: string;
  paymentTerms: string | null;
  validUntil: string | null;
  createdAt: string;
  opportunity: { id: string; code: string; title: string } | null;
  lineItems: PortalQuotationLine[];
}

export function usePortalQuotations() {
  return useQuery({
    queryKey: ["portal", "quotations"],
    queryFn: async () => (await apiClient.get<PortalQuotation[]>("/portal/quotations")).data,
  });
}
export function usePortalQuotation(id: string) {
  return useQuery({
    queryKey: ["portal", "quotations", id],
    queryFn: async () => (await apiClient.get<PortalQuotation>(`/portal/quotations/${id}`)).data,
    enabled: !!id,
  });
}

export interface PortalPurchaseOrder {
  id: string;
  code: string;
  poNumber: string;
  amount: string;
  currency: string;
  status: string;
  receivedAt: string;
  quotation: { id: string; code: string; grandTotal: string; currency: string } | null;
  salesOrder: { id: string; code: string; status: string } | null;
}

export function usePortalPurchaseOrders() {
  return useQuery({
    queryKey: ["portal", "purchase-orders"],
    queryFn: async () => (await apiClient.get<PortalPurchaseOrder[]>("/portal/purchase-orders")).data,
  });
}
export function usePortalPurchaseOrder(id: string) {
  return useQuery({
    queryKey: ["portal", "purchase-orders", id],
    queryFn: async () => (await apiClient.get<PortalPurchaseOrder>(`/portal/purchase-orders/${id}`)).data,
    enabled: !!id,
  });
}

export interface PortalMilestone {
  id: string;
  key: string;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
}
export interface PortalProject {
  id: string;
  code: string;
  name: string;
  status: string;
  plannedGoLiveDate: string | null;
  actualGoLiveDate: string | null;
  manager: { id: string; firstName: string; lastName: string } | null;
  milestones: PortalMilestone[];
  site: { id: string; label: string; city: string | null; country: string | null } | null;
}

export function usePortalProjects() {
  return useQuery({
    queryKey: ["portal", "projects"],
    queryFn: async () => (await apiClient.get<PortalProject[]>("/portal/projects")).data,
  });
}
export function usePortalProject(id: string) {
  return useQuery({
    queryKey: ["portal", "projects", id],
    queryFn: async () => (await apiClient.get<PortalProject>(`/portal/projects/${id}`)).data,
    enabled: !!id,
  });
}

export interface PortalPayment {
  id: string;
  amount: string;
  currency: string;
  method: string;
  receivedAt: string;
}
export interface PortalInvoice {
  id: string;
  code: string;
  status: string;
  currency: string;
  totalAmount: string;
  amountPaid: string;
  dueDate: string;
  issuedAt: string | null;
  payments: PortalPayment[];
}

export function usePortalInvoices() {
  return useQuery({
    queryKey: ["portal", "invoices"],
    queryFn: async () => (await apiClient.get<PortalInvoice[]>("/portal/invoices")).data,
  });
}
export function usePortalInvoice(id: string) {
  return useQuery({
    queryKey: ["portal", "invoices", id],
    queryFn: async () => (await apiClient.get<PortalInvoice>(`/portal/invoices/${id}`)).data,
    enabled: !!id,
  });
}

export interface PortalTicketComment {
  id: string;
  body: string;
  createdAt: string;
}
export interface PortalTicket {
  id: string;
  code: string;
  subject: string;
  description: string | null;
  priority: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  assignee: { id: string; firstName: string; lastName: string } | null;
  comments?: PortalTicketComment[];
}

export function usePortalTickets() {
  return useQuery({
    queryKey: ["portal", "support"],
    queryFn: async () => (await apiClient.get<PortalTicket[]>("/portal/support")).data,
  });
}
export function usePortalTicket(id: string) {
  return useQuery({
    queryKey: ["portal", "support", id],
    queryFn: async () => (await apiClient.get<PortalTicket>(`/portal/support/${id}`)).data,
    enabled: !!id,
  });
}
export function useCreatePortalTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { subject: string; description?: string; priority: string }) =>
      (await apiClient.post<PortalTicket>("/portal/support", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portal", "support"] }),
  });
}
export function useAddPortalTicketComment(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => (await apiClient.post(`/portal/support/${ticketId}/comments`, { body })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portal", "support", ticketId] }),
  });
}
