const DEFAULT_API_URL = "http://127.0.0.1:5050/api/v1";

/** Configured API base URL (server-side / build time). */
export function configuredApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

/**
 * API base URL for the current request context.
 * On a phone/tablet hitting the dev machine via LAN IP, rewrites localhost → that IP
 * so uploads and auth calls reach the Flask API on the same host as Next.js.
 */
export function getApiUrl(): string {
  const configured = configuredApiUrl();
  if (typeof window === "undefined") {
    return configured;
  }

  try {
    const { hostname } = window.location;
    const onLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
    if (onLocalHost) {
      return configured;
    }

    const url = new URL(configured);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      url.hostname = hostname;
      return url.toString().replace(/\/$/, "");
    }
  } catch {
    // fall through
  }

  return configured;
}

/** Origin for therapist photo URLs (API host without /api/v1). */
export function getApiOrigin(): string {
  return getApiUrl().replace(/\/api\/v1\/?$/, "");
}
