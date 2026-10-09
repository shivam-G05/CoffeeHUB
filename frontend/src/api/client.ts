import axios from "axios";
import type { UploadedFile } from "../types";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("coffeehub_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("coffeehub_token");
      localStorage.removeItem("coffeehub_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
}

/** Turns a stored image reference (an /api/files/... path or a full URL) into something an <img> can load. */
export function fileUrl(pathOrUrl?: string | null): string | undefined {
  if (!pathOrUrl) return undefined;
  return pathOrUrl.startsWith("/api/") ? `${API_BASE_URL}${pathOrUrl}` : pathOrUrl;
}

/**
 * "public" is for images shown on the site (product photos, logos, dispute evidence).
 * "private" is for verification documents: PDF or image, readable only by the uploader and admins.
 */
export async function uploadFile(file: File, visibility: "public" | "private" = "public"): Promise<UploadedFile> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post<UploadedFile>("/api/files", form, { params: { visibility } });
  return res.data;
}

/** Fetches a protected file with the auth header and hands it to the browser (new tab, or a download when a name is given). */
export async function openProtected(path: string, downloadName?: string): Promise<void> {
  const res = await api.get<Blob>(path, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  if (downloadName) {
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadName;
    link.click();
  } else {
    window.open(url, "_blank", "noopener");
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export type AnalyticsEvent =
  | "signup_started"
  | "signup_completed"
  | "vendor_registration"
  | "search"
  | "product_view"
  | "supplier_view"
  | "add_to_cart"
  | "checkout_started"
  | "purchase"
  | "rfq_started"
  | "rfq_submitted"
  | "quote_accepted";

function sessionId(): string {
  let id = sessionStorage.getItem("coffeehub_session");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("coffeehub_session", id);
  }
  return id;
}

/** Fire-and-forget funnel event. Never throws: analytics must not break a user flow. */
export function track(name: AnalyticsEvent, detail?: string | number): void {
  api
    .post("/api/analytics/events", { name, sessionId: sessionId(), detail: detail == null ? undefined : String(detail) })
    .catch(() => undefined);
}
