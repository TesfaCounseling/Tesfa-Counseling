"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import FeedbackPageLocationSetter from "@/components/FeedbackPageLocationSetter";
import PageHero from "@/components/PageHero";
import { getMyProviderProfile, hasAuthSession, updateMyProviderProfile } from "@/lib/api";
import { useLanguage } from "@/components/LanguageProvider";

const METHOD_OPTIONS = ["Remitly", "TapTap Send", "Wise", "Western Union", "CBE"];

export default function ProviderPayoutPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accountName, setAccountName] = useState("");
  const [details, setDetails] = useState("");
  const [methods, setMethods] = useState<string[]>(METHOD_OPTIONS);

  useEffect(() => {
    if (!hasAuthSession()) {
      router.replace("/login?next=/provider/payout");
      return;
    }
    getMyProviderProfile()
      .then((data) => {
        setAccountName(data.profile.payout_account_name || "");
        setDetails(data.profile.payout_details || "");
        setMethods(data.profile.payout_methods?.length ? data.profile.payout_methods : METHOD_OPTIONS);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load payout settings"))
      .finally(() => setLoading(false));
  }, [router]);

  function toggleMethod(method: string) {
    setMethods((current) =>
      current.includes(method) ? current.filter((item) => item !== method) : [...current, method]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await updateMyProviderProfile({
        payout_account_name: accountName.trim(),
        payout_details: details.trim(),
        payout_methods: methods.join(", "),
      });
      setAccountName(result.profile.payout_account_name || "");
      setDetails(result.profile.payout_details || "");
      setMethods(result.profile.payout_methods?.length ? result.profile.payout_methods : METHOD_OPTIONS);
      setSuccess(t("payout.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-shell">
      <FeedbackPageLocationSetter screen="Counselor" tab="Payout settings" />
      <SiteHeader showAuth={false} />
      <PageHero
        eyebrow="Your practice"
        title={t("payout.title")}
        subtitle={t("payout.subtitle")}
        backHref="/dashboard"
        backLabel="Dashboard"
      />
      <main className="mx-auto max-w-5xl page-pad pb-12 pt-2">
        {loading ? (
          <p className="text-base text-ethio-ink-muted">{t("common.loading")}</p>
        ) : (
          <form onSubmit={handleSubmit} className="card-vibrant space-y-5 p-6">
            <label className="block text-base font-medium text-ethio-ink">
              {t("payout.accountName")}
              <input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="input-field"
                autoComplete="name"
              />
            </label>
            <label className="block text-base font-medium text-ethio-ink">
              {t("payout.details")}
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={6}
                className="input-field"
                placeholder="Bank name, account number, branch, or wallet ID"
              />
              <span className="mt-1 block text-base font-normal text-ethio-ink-muted">{t("payout.detailsHint")}</span>
            </label>
            <fieldset>
              <legend className="text-base font-medium text-ethio-ink">{t("payout.methods")}</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {METHOD_OPTIONS.map((method) => (
                  <label key={method} className="flex min-w-0 items-center gap-2 text-base text-ethio-ink">
                    <input
                      type="checkbox"
                      checked={methods.includes(method)}
                      onChange={() => toggleMethod(method)}
                    />
                    {method}
                  </label>
                ))}
              </div>
            </fieldset>
            {error && <p className="alert-error">{error}</p>}
            {success && <p className="alert-success">{success}</p>}
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={saving} className="btn-primary text-base disabled:opacity-60">
                {saving ? t("common.pleaseWait") : t("payout.save")}
              </button>
              <Link href="/provider/profile" className="rounded-lg border border-ethio-border px-4 py-2 text-base font-semibold text-ethio-ink-muted">
                Edit profile
              </Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
