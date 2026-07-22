"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { toast } from "./toast";
import { getAccessToken } from "./api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export interface FileAsset {
  id: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  version: number;
  createdAt: string;
}

export function useFiles(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ["files", entityType, entityId],
    queryFn: async () => (await apiClient.get<FileAsset[]>(`/files?entityType=${entityType}&entityId=${entityId}`)).data,
    enabled: !!entityId,
  });
}

export function useUploadFile(entityType: string, entityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("entityType", entityType);
      form.append("entityId", entityId);

      const token = getAccessToken();
      const res = await fetch(`${API_URL}/files`, {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      const body = await res.json();
      if (!res.ok || body.success === false) throw new Error(body.error?.message ?? "Upload failed");
      return body.data as FileAsset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", entityType, entityId] });
      toast.success("Saved");
    },
  });
}

/** Fetches a short-lived presigned URL for this file and opens it in a new tab. */
export async function openFile(id: string) {
  const { url } = (await apiClient.get<{ url: string; fileName: string }>(`/files/${id}/download`)).data;
  window.open(url, "_blank", "noopener,noreferrer");
}
