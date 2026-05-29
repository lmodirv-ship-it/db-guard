/**
 * عنوان الـ Backend API.
 * - في Lovable (hn-db.online): يُشير إلى VPS (hn-db.fun)
 * - في VPS ذاته: فارغ (نفس origin)
 *
 * غيّر القيمة في `.env` على Lovable:
 *   VITE_BACKEND_URL=https://hn-db.fun
 */
export const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "") || "";

/**
 * Helper: يبني URL كامل لأي endpoint من الـ API.
 *   apiUrl("/api/auth/login")  →  "https://hn-db.fun/api/auth/login"
 */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BACKEND_URL}${p}`;
}

/**
 * Wrapper حول fetch يضيف الـ BACKEND_URL تلقائياً ويُفعّل credentials.
 */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), {
    credentials: "include",
    ...init,
  });
}
