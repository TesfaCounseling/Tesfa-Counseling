const DEFAULT_API_URL = "http://127.0.0.1:5050/api/v1";
export const SAME_ORIGIN_API_URL = "/api/v1";

/** Configured API base URL (server-side / build time). */
export function configuredApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

/**
 * Browser calls go to the same origin (`/api/v1`) so login cookies are first-party
 * (Netlify rewrite in production, Next rewrite locally).
 * Server components still use NEXT_PUBLIC_API_URL (Render) for SSR.
 */
export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    return SAME_ORIGIN_API_URL;
  }
  return configuredApiUrl().replace(/\/$/, "");
}

/** Origin for therapist photo URLs (API host without /api/v1). */
export function getApiOrigin(): string {
  const apiUrl = getApiUrl();
  if (apiUrl.startsWith("/")) {
    return "";
  }
  return apiUrl.replace(/\/api\/v1\/?$/, "");
}
