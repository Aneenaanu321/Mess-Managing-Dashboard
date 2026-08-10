import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const ACCESS_TOKEN_COOKIE = "rfidcore_access";
const REMEMBER_FLAG_KEY = "rfidcore_remember_flag";

// Access token: short-lived JS-readable cookie for Bearer headers; refresh token stays httpOnly.
export function getAccessToken(): string | undefined {
  return Cookies.get(ACCESS_TOKEN_COOKIE);
}

function shouldRemember(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(REMEMBER_FLAG_KEY) === "1";
}

export function setAccessToken(token: string, rememberMe = false) {
  if (typeof window !== "undefined") {
    if (rememberMe) localStorage.setItem(REMEMBER_FLAG_KEY, "1");
    else localStorage.removeItem(REMEMBER_FLAG_KEY);
  }
  Cookies.set(ACCESS_TOKEN_COOKIE, token, {
    expires: rememberMe ? 7 : 1 / 96, // 7 days vs ~15 min
    sameSite: "lax",
  });
}

export function clearAccessToken() {
  Cookies.remove(ACCESS_TOKEN_COOKIE);
  if (typeof window !== "undefined") localStorage.removeItem(REMEMBER_FLAG_KEY);
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: { total: number; page: number; pageSize: number; totalPages: number };
  error?: { message: string; details?: unknown };
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<ApiEnvelope<T>> {
  const token = getAccessToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Don't attempt refresh+retry on auth endpoints (login 401 must surface as-is).
  const isAuthEndpoint = path.startsWith("/auth/login") || path.startsWith("/auth/register") || path.startsWith("/auth/forgot-password") || path.startsWith("/auth/reset-password");
  if (res.status === 401 && retry && !isAuthEndpoint) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, options, false);
  }

  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!res.ok || body.success === false) {
    throw new Error(body.error?.message ?? `Request failed with status ${res.status}`);
  }

  return body;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, { method: "POST", credentials: "include" });
    if (!res.ok) return false;
    const body = await res.json();
    if (body?.data?.accessToken) {
      setAccessToken(body.data.accessToken, shouldRemember());
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  patch: <T>(path: string, data?: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
