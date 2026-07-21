"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, setAccessToken, clearAccessToken } from "./api-client";

export interface CurrentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  role: { key: string; name: string };
  permissions: string[];
  company: { id: string; name: string; currency: string };
  branch: { id: string; name: string } | null;
}

const REMEMBERED_EMAIL_KEY = "rfidcore_remembered_email";

export function getRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";
}

export function setRememberedEmail(email: string | null) {
  if (typeof window === "undefined") return;
  if (email) localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
  else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => (await apiClient.get<CurrentUser>("/auth/me")).data,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; password: string; rememberMe?: boolean }) => {
      const res = await apiClient.post<{ accessToken: string; user: CurrentUser; rememberMe?: boolean }>(
        "/auth/login",
        input,
      );
      return res.data;
    },
    onSuccess: (data, variables) => {
      setAccessToken(data.accessToken, variables.rememberMe);
      if (variables.rememberMe) setRememberedEmail(variables.email);
      else setRememberedEmail(null);
      queryClient.setQueryData(["me"], data.user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { firstName: string; lastName: string; email: string; password: string }) => {
      const res = await apiClient.post<{ accessToken: string; user: CurrentUser }>("/auth/register", input);
      return res.data;
    },
    onSuccess: (data) => {
      setAccessToken(data.accessToken, true);
      setRememberedEmail(data.user.email);
      queryClient.setQueryData(["me"], data.user);
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (input: { email: string }) => {
      const res = await apiClient.post<{
        message: string;
        resetToken: string | null;
        resetUrl: string | null;
      }>("/auth/forgot-password", input);
      return res.data;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (input: { token: string; password: string }) => {
      const res = await apiClient.post<{ message: string }>("/auth/reset-password", input);
      return res.data;
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => apiClient.post("/auth/logout"),
    onSuccess: () => {
      clearAccessToken();
      queryClient.clear();
    },
  });
}

/** Client-side permission check, mirroring the server's authorize() logic. UI hiding only — never the real boundary. */
export function hasPermission(user: CurrentUser | undefined, permission: string): boolean {
  if (!user) return false;
  return user.permissions.includes("*:*") || user.permissions.includes(permission);
}
