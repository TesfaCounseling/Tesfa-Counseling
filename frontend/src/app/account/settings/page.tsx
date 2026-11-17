"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import PageHero from "@/components/PageHero";
import TimezoneSelect from "@/components/TimezoneSelect";
import { syncLanguageFromProfile, useLanguage } from "@/components/LanguageProvider";
import { getMe, hasAuthSession, updateMyPreferences } from "@/lib/api";
import { getBrowserTimezone } from "@/lib/format";
import { isAppLanguage, type AppLanguage } from "@/lib/i18n";

export default function AccountSettingsPage() {
  const router = useRouter();
  const { t, setLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timezone, setTimezone] = useState("");
  const [detectedTimezone, setDetectedTimezone] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<AppLanguage>("en");

  useEffect(() => {
    setDetectedTimezone(getBrowserTimezone());
    if (!hasAuthSession()) {
      router.replace("/login?next=/account/settings");
      return;
    }
    getMe()
      .then((data) => {
        setTimezone(data.user.timezone || "");
        if (isAppLanguage(data.user.preferred_language)) {
          setPreferredLanguage(data.user.preferred_language);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load settings"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!timezone.trim()) {
      setError(t("register.timezoneRequired"));
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await updateMyPreferences({
        timezone: timezone.trim(),
        preferred_language: preferredLanguage,
      });
      if (isAppLanguage(result.user.preferred_language)) {
        setLanguage(result.user.preferred_language);
        syncLanguageFromProfile(result.user.preferred_language);
      }
      setTimezone(result.user.timezone || timezone);
      setSuccess(t("account.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-shell">
      <SiteHeader showAuth={false} />
      <PageHero
        title={t("account.settingsTitle")}
        subtitle={t("account.settingsSubtitle")}
        backHref="/dashboard"
        backLabel={t("nav.dashboard")}
      />
      <main className="mx-auto max-w-5xl page-pad pb-12 pt-2">
        {loading ? (
          <p className="text-sm text-ethio-ink-muted">{t("common.loading")}</p>
        ) : (
          <form onSubmit={handleSubmit} className="card-vibrant space-y-5 p-6">
            <TimezoneSelect
              value={timezone}
              onChange={setTimezone}
              detectedTimezone={detectedTimezone}
              prominent
              label={t("register.timezone")}
              hint={t("register.timezoneHint")}
            />
            <label className="block text-sm font-medium text-ethio-ink">
              {t("register.preferredLanguage")}
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value as AppLanguage)}
                className="input-field"
              >
                <option value="en">{t("lang.english")}</option>
                <option value="am">{t("lang.amharic")}</option>
              </select>
            </label>
            {error && <p className="alert-error">{error}</p>}
            {success && <p className="alert-success">{success}</p>}
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? t("common.pleaseWait") : t("account.save")}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
