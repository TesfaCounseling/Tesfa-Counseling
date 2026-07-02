import CounselorsPageShell from "@/components/CounselorsPageShell";
import type { Provider } from "@/lib/api";

import { configuredApiUrl } from "@/lib/apiBase";

const API_URL = configuredApiUrl();

async function getProviders(): Promise<{ providers: Provider[]; error: string | null }> {
  try {
    const res = await fetch(`${API_URL}/therapists`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        providers: [],
        error: (body as { message?: string }).message || `API error (${res.status})`,
      };
    }
    const data = (await res.json()) as { providers?: Provider[] };
    return { providers: data.providers ?? [], error: null };
  } catch (err) {
    const message =
      err instanceof Error && err.name === "TimeoutError"
        ? "Request timed out — is the backend running on port 5050?"
        : "Cannot reach the API. Start the backend with: cd backend && python run.py";
    return { providers: [], error: message };
  }
}

export default async function CounselorsPage() {
  const { providers, error } = await getProviders();
  return <CounselorsPageShell providers={providers} error={error} />;
}
