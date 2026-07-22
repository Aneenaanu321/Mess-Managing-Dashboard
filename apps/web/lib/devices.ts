"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { toast } from "./toast";

export type DeviceType = "READER" | "ANTENNA" | "GATE" | "HANDHELD" | "PRINTER" | "TAG" | "LABEL_APPLICATOR" | "EAS_SYSTEM" | "OTHER";
export type DeviceStatus = "IN_STOCK" | "ALLOCATED" | "INSTALLED" | "FAULTY" | "RETIRED" | "RMA";

export interface Device {
  id: string;
  serialNumber: string;
  type: DeviceType;
  status: DeviceStatus;
  product: { id: string; sku: string; name: string };
  project: { id: string; code: string; name: string } | null;
  site: { id: string; label: string } | null;
  location: string | null;
  firmwareVersion: string | null;
  installedAt: string | null;
  tickets?: { id: string; code: string; subject: string; status: string }[];
  createdAt: string;
}

export interface CreateDeviceInput {
  serialNumber: string;
  type: DeviceType;
  productId: string;
  siteId?: string;
  projectId?: string;
  firmwareVersion?: string;
  location?: string;
}

export const DEVICE_TYPES: DeviceType[] = ["READER", "ANTENNA", "GATE", "HANDHELD", "PRINTER", "TAG", "LABEL_APPLICATOR", "EAS_SYSTEM", "OTHER"];
export const DEVICE_STATUSES: DeviceStatus[] = ["IN_STOCK", "ALLOCATED", "INSTALLED", "FAULTY", "RETIRED", "RMA"];

export const DEVICE_STATUS_TONE: Record<DeviceStatus, "slate" | "green" | "amber" | "red" | "blue"> = {
  IN_STOCK: "slate",
  ALLOCATED: "blue",
  INSTALLED: "green",
  FAULTY: "red",
  RETIRED: "slate",
  RMA: "amber",
};

export function useDevices(params: { type?: string; status?: string; projectId?: string; search?: string; page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.type) query.set("type", params.type);
  if (params.status) query.set("status", params.status);
  if (params.projectId) query.set("projectId", params.projectId);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));

  return useQuery({
    queryKey: ["devices", params],
    queryFn: async () => apiClient.get<Device[]>(`/devices?${query.toString()}`),
  });
}

export function useDevice(id: string) {
  return useQuery({
    queryKey: ["devices", id],
    queryFn: async () => (await apiClient.get<Device>(`/devices/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDeviceInput) => (await apiClient.post<Device>("/devices", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast.success("Saved");
    },
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CreateDeviceInput> & { status?: DeviceStatus } }) =>
      (await apiClient.patch<Device>(`/devices/${id}`, input)).data,
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["devices", vars.id] });
    },
  });
}
