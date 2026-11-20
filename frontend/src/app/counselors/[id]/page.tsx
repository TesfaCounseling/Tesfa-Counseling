import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import SiteHeader from "@/components/SiteHeader";
import { ProviderAvatar } from "@/components/ProviderCard";
import type { Provider } from "@/lib/api";
import { configuredApiUrl } from "@/lib/apiBase";
import { parseProviderTags, publicApprovedProviders } from "@/lib/providerUtils";
import { pageMetadata } from "@/lib/seo";

const API_URL = configuredApiUrl();

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return pageMetadata(
    "Counselor profile",
    "Meet a Tesfa Counseling counselor and book a secure online session.",
    `/counselors/${encodeURIComponent(id)}`
  );
}

async function loadProvider(id: string): Promise<Provider | null> {
  try {
    const res = await fetch(`${API_URL}/therapists/${encodeURIComponent(id)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const data = (await res.json()) as { provider?: Provider };
    const provider = data.provider;
    if (!provider) return null;
    return publicApprovedProviders([provider])[0] ?? null;
  } catch {
    return null;
  }
}

export default async function CounselorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const provider = await loadProvider(id);
  if (!provider) notFound();

  const specialties = parseProviderTags(provider.specializations);
  const languages = parseProviderTags(provider.languages);
  const title =
    provider.type === "trainee"
      ? "Supervised trainee"
      : provider.professional_title?.trim() || "Licensed counselor";

  return (
    <div className="page-shell">
      <SiteHeader />
      <PageHero
        eyebrow="Counselor"
        title={provider.full_name}
        subtitle={title}
        backHref="/counselors"
        backLabel="All counselors"
      />
      <main className="mx-auto w-full min-w-0 max-w-5xl page-pad pb-16">
        <article className="card-vibrant p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <ProviderAvatar name={provider.full_name} photoUrl={provider.photo_url} size="lg" />
            <div className="min-w-0 flex-1">
              {provider.practice_location?.trim() && (
                <p className="text-base text-ethio-ink-muted">{provider.practice_location}</p>
              )}
              {provider.bio?.trim() && (
                <p className="mt-3 text-base leading-relaxed text-ethio-ink">{provider.bio}</p>
              )}
              {specialties.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {specialties.map((tag) => (
                    <span key={tag} className="tag-chip text-base">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {languages.length > 0 && (
                <p className="mt-3 text-base text-ethio-ink-muted">Languages: {languages.join(" · ")}</p>
              )}
            </div>
          </div>
          <div className="mt-6 border-t border-ethio-border pt-5">
            <Link href={`/counselors/${provider.id}/book`} className="btn-primary inline-flex min-h-[44px]">
              Book a session
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}
