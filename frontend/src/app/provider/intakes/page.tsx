"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import PageHero from "@/components/PageHero";
import { listProviderIntakes, type TraineeIntakeRecord } from "@/lib/api";
import { formatDateTime, formatStatusLabel } from "@/lib/format";

export default function ProviderIntakesPage() {
  const router = useRouter();
  const [intakes, setIntakes] = useState<TraineeIntakeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("access_token")) {
      router.push("/login?next=/provider/intakes");
      return;
    }
    listProviderIntakes()
      .then((data) => setIntakes(data.intakes))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load intakes"))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="page-shell">
      <SiteHeader showAuth={false} />
      <PageHero
        eyebrow="Client intake"
        title="Trainee intake forms"
        subtitle="Review intake information submitted by clients before their first session with you."
        backHref="/dashboard"
        backLabel="Dashboard"
      />
      <main className="mx-auto max-w-3xl page-pad pb-12 pt-2">
        {error && <p className="mb-4 alert-error">{error}</p>}
        {loading && <p className="text-sm text-ethio-ink-muted">Loading…</p>}

        {!loading && intakes.length === 0 && (
          <div className="card-vibrant p-8 text-center">
            <p className="font-semibold text-ethio-ink">No intake forms yet</p>
            <p className="mt-2 text-sm text-ethio-ink-muted">
              Clients complete intake before booking with you for the first time.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {intakes.map((intake) => (
            <article key={intake.id} className="card-vibrant p-5">
              <button
                type="button"
                onClick={() => setExpanded(expanded === intake.id ? null : intake.id)}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <div>
                  <p className="font-semibold text-ethio-ink">{intake.client_name}</p>
                  <p className="text-sm text-ethio-ink-muted">
                    Completed {intake.completed_at && formatDateTime(intake.completed_at)} ·{" "}
                    {formatStatusLabel(intake.preferred_session_mode.replace("_", " "))}
                  </p>
                </div>
                <span className="text-sm text-ethio-green-dark">{expanded === intake.id ? "Hide" : "View"}</span>
              </button>

              {expanded === intake.id && (
                <div className="mt-4 space-y-3 border-t border-ethio-border pt-4 text-sm">
                  <p>
                    <span className="font-semibold text-ethio-ink">Concerns:</span> {intake.presenting_concerns}
                  </p>
                  <p>
                    <span className="font-semibold text-ethio-ink">Goals:</span> {intake.primary_goals}
                  </p>
                  {intake.prior_therapy && (
                    <p>
                      <span className="font-semibold text-ethio-ink">Prior therapy:</span> {intake.prior_therapy}
                    </p>
                  )}
                  {intake.current_medications && (
                    <p>
                      <span className="font-semibold text-ethio-ink">Medications:</span> {intake.current_medications}
                    </p>
                  )}
                  <p>
                    <span className="font-semibold text-ethio-ink">Emergency contact:</span>{" "}
                    {intake.emergency_contact_name} · {intake.emergency_contact_phone}
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>

        <Link href="/provider/notes" className="mt-6 inline-block text-sm font-semibold text-ethio-green-dark">
          ← Session notes
        </Link>
      </main>
    </div>
  );
}
