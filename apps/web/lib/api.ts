"use client";

export { label } from "./i18n";
export type { LabelKind } from "./i18n";
import { vi as translate } from "./i18n";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export type CurrentUser = {
  id: string;
  sub?: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "FACILITY_MANAGER" | "TECHNICIAN" | "REPORTER";
};

const ACCESS_KEY = "edufix_access_token";
const REFRESH_KEY = "edufix_refresh_token";

export function saveSession(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem("edufix_token", accessToken);
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem("edufix_token");
}

export function accessToken() {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem(ACCESS_KEY) ??
    localStorage.getItem("edufix_token") ??
    ""
  );
}

async function refreshSession() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return false;
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) return false;
  const data = await response.json();
  saveSession(data.accessToken, data.refreshToken);
  return true;
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = accessToken();
  const isForm = init.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (
    response.status === 401 &&
    retry &&
    typeof window !== "undefined" &&
    (await refreshSession())
  )
    return api<T>(path, init, false);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message;
    throw new Error(message || `Yêu cầu thất bại (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function getCurrentUser() {
  return api<CurrentUser>("/auth/me");
}

export const vi = translate;
export const dateTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
export const money = (value?: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
