"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { INDUSTRIES } from "./leads";

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}

export interface Site {
  id: string;
  label: string;
  addressLine: string | null;
  city: string | null;
  country: string | null;
}

export interface CustomerOpportunitySummary {
  id: string;
  code: string;
  title: string;
  stage: string;
  estimatedValue: string;
  currency: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  industry: string;
  website: string | null;
  taxId: string | null;
  owner: { id: string; firstName: string; lastName: string } | null;
  contacts?: Contact[];
  sites?: Site[];
  opportunities?: CustomerOpportunitySummary[];
  createdAt: string;
}

export interface CreateCustomerInput {
  name: string;
  industry: string;
  website?: string;
  taxId?: string;
  primaryContact?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
}

export interface UpdateCustomerInput {
  name?: string;
  industry?: string;
  website?: string;
  taxId?: string;
}

export function useCustomers(params: { industry?: string; search?: string; page?: number; pageSize?: number } = {}) {
  const query = new URLSearchParams();
  if (params.industry) query.set("industry", params.industry);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  return useQuery({
    queryKey: ["customers", params],
    queryFn: async () => apiClient.get<Customer[]>(`/customers?${query.toString()}`),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ["customers", id],
    queryFn: async () => (await apiClient.get<Customer>(`/customers/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCustomerInput) => (await apiClient.post<Customer>("/customers", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateCustomerInput }) =>
      (await apiClient.patch<Customer>(`/customers/${id}`, input)).data,
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers", vars.id] });
    },
  });
}

export { INDUSTRIES };
