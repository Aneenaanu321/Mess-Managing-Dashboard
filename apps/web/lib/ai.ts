"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "./api-client";

export interface AiChatResponse {
  reply: string;
}

export function useAiChat() {
  return useMutation({
    mutationFn: async (message: string) => (await apiClient.post<AiChatResponse>("/ai/chat", { message })).data,
  });
}
