"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { toast } from "./toast";

export interface Approval {
  id: string;
  entityType: string;
  entityId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string | null;
  comment: string | null;
  requestedAt: string;
  decidedAt: string | null;
  requestedBy: { id: string; firstName: string; lastName: string };
  decidedBy: { id: string; firstName: string; lastName: string } | null;
  quotation: { id: string; code: string; grandTotal: string; currency: string; status: string; customer: { name: string } } | null;
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: ["approvals", "PENDING"],
    queryFn: async () => (await apiClient.get<Approval[]>("/approvals?status=PENDING")).data,
  });
}

export function useDecideApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, comment }: { id: string; action: "APPROVE" | "REJECT"; comment?: string }) =>
      (await apiClient.post<Approval>(`/approvals/${id}/decide`, { action, comment })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
    },
  });
}
