import SiteHeader from "@/components/SiteHeader";
import PageHero from "@/components/PageHero";
import CounselorList from "@/components/CounselorList";
import { APP_NAME, TAGLINE } from "@/lib/brand";
import type { Provider } from "@/lib/api";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5050/api/v1";

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

  return (
    <div className="page-shell">
      <SiteHeader />

      <PageHero
        eyebrow="Our counselors"
        title="Find a counselor"
        subtitle="Browse culturally informed counselors and supervised trainees serving the Ethiopian diaspora. Match by language and availability."
      />

      <main className="mx-auto max-w-5xl page-pad pb-12 pt-6">
        {error && <p className="alert-error">{error}</p>}

        {!error && providers.length > 0 && <CounselorList providers={providers} />}

        {!error && providers.length === 0 && (          <div className="empty-state mt-6">
            <span className="text-3xl" aria-hidden>
              🔍
            </span>
            <p className="mt-3 font-semibold text-ethio-ink">No counselors listed yet</p>
            <p className="mt-1 text-sm text-ethio-ink-muted">
              Run <code className="rounded bg-ethio-surface-warm px-1.5 py-0.5">python seed_demo_counselor.py</code> in
              the backend folder to add a demo provider.
            </p>
          </div>
        )}
      </main>

      <footer className="site-footer mt-8 border-t page-pad py-6 text-center">
        <p className="text-xs font-medium text-ethio-green">{APP_NAME} · {TAGLINE}</p>
      </footer>
    </div>
  );
}
