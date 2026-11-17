import type { Metadata } from "next";
import type { Provider } from "@/lib/api";
import HomePageShell from "@/components/HomePageShell";
import { configuredApiUrl } from "@/lib/apiBase";
import { publicApprovedProviders } from "@/lib/providerUtils";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.home;

const API_URL = configuredApiUrl();

async function getProviders(): Promise<Provider[]> {
  try {
    const res = await fetch(`${API_URL}/therapists`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { providers?: Provider[] };
    return publicApprovedProviders(data.providers ?? []);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const providers = await getProviders();
  return <HomePageShell providers={providers} />;
}
