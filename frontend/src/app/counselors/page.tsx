import type { Metadata } from "next";
import CounselorsPageShell from "@/components/CounselorsPageShell";
import type { Provider } from "@/lib/api";
import { configuredApiUrl } from "@/lib/apiBase";
import { publicApprovedProviders } from "@/lib/providerUtils";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.counselors;

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
    return { providers: publicApprovedProviders(data.providers ?? []), error: null };
  } catch {
    return {
      providers: [],
      error: "We couldn't load counselors right now. Please try again in a moment.",
    };
  }
}

export default async function CounselorsPage() {
  const { providers, error } = await getProviders();
  return <CounselorsPageShell providers={providers} error={error} />;
}
