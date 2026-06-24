"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import PageHero from "@/components/PageHero";
import TraineeIntakeForm, { type IntakeFormData } from "@/components/TraineeIntakeForm";
import { getProvider, getTraineeIntakeStatus, submitTraineeIntake, type Provider } from "@/lib/api";

export default function TraineeIntakePage() {
  const params = useParams();
  const router = useRouter();
  const providerId = String(params.id);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("access_token")) {
      router.push(`/login?next=/counselors/${providerId}/intake`);
      return;
    }
    Promise.all([getProvider(providerId), getTraineeIntakeStatus(providerId)])
      .then(([providerData, status]) => {
        if (providerData.provider.type !== "trainee") {
          router.replace(`/counselors/${providerId}/book`);
          return;
        }
        if (status.completed) {
          router.replace(`/counselors/${providerId}/book`);
          return;
        }
        setProvider(providerData.provider);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [providerId, router]);

  async function handleSubmit(data: IntakeFormData) {
    await submitTraineeIntake(providerId, data);
    router.push(`/counselors/${providerId}/book`);
  }

  return (
    <div className="page-shell">
      <SiteHeader />
      <PageHero
        backHref={`/counselors/${providerId}/book`}
        backLabel="Back to booking"
        eyebrow="Required intake"
        title="Before your first session"
        subtitle="Help your trainee counselor prepare and confirm you understand supervised care."
      />
      <main className="mx-auto max-w-2xl page-pad pb-12 pt-6">
        {loading && <p className="text-sm text-ethio-ink-muted">Loading…</p>}
        {error && <p className="alert-error">{error}</p>}
        {provider && !loading && (
          <TraineeIntakeForm provider={provider} onSubmit={handleSubmit} />
        )}
      </main>
    </div>
  );
}
