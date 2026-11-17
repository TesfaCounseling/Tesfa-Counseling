"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import AuthShell from "@/components/AuthShell";
import { useLanguage } from "@/components/LanguageProvider";
import TimezoneSelect from "@/components/TimezoneSelect";
import { AMHARIC_UI_ENABLED } from "@/lib/featureFlags";
import { type AppLanguage } from "@/lib/i18n";
import { registerUser } from "@/lib/api";
import { getBrowserTimezone } from "@/lib/format";
import { isSafeNextPath, postLoginPath } from "@/lib/safeNext";

type RegisterRole = "client" | "therapist";

type RegisterFormProps = {
  defaultRole: RegisterRole;
  lockRole?: boolean;
};

export default function RegisterForm({ defaultRole, lockRole = false }: RegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language, setLanguage } = useLanguage();
  const roleParam = searchParams.get("role");
  const nextPath = searchParams.get("next");
  const safeNext = postLoginPath(nextPath);
  const resolvedDefault: RegisterRole =
    roleParam === "client" || roleParam === "therapist" ? roleParam : defaultRole;

  const [role, setRole] = useState<RegisterRole>(resolvedDefault);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState<AppLanguage>(language);
  const [timezone, setTimezone] = useState("");
  const [detectedTimezone, setDetectedTimezone] = useState("");

  useEffect(() => {
    setRole(resolvedDefault);
  }, [resolvedDefault]);

  useEffect(() => {
    setPreferredLanguage(language);
  }, [language]);

  useEffect(() => {
    setDetectedTimezone(getBrowserTimezone());
  }, []);

  const copy =
    role === "client"
      ? {
          title: t("register.client.title"),
          subtitle: t("register.client.subtitle"),
          submitLabel: t("register.client.submit"),
        }
      : {
          title: t("register.therapist.title"),
          subtitle: t("register.therapist.subtitle"),
          submitLabel: t("register.therapist.submit"),
        };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    if (!timezone.trim()) {
      setError(t("register.timezoneRequired"));
      setLoading(false);
      return;
    }
    try {
      const payload: Parameters<typeof registerUser>[0] = {
        email: String(form.get("email")),
        password: String(form.get("password")),
        first_name: String(form.get("first_name")),
        last_name: String(form.get("last_name")),
        role,
        timezone: timezone.trim(),
      };
      if (role === "client") {
        payload.preferred_language = AMHARIC_UI_ENABLED ? preferredLanguage : "en";
      } else {
        payload.organization_name = String(form.get("organization_name") || "");
        payload.languages = String(form.get("languages") || "").trim();
      }
      if (role === "therapist") {
        payload.specializations = String(form.get("specializations") || "").trim();
      }
      const result = await registerUser(payload);
      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("refresh_token", result.refresh_token);
      setLanguage(preferredLanguage);
      router.push(role === "client" ? safeNext : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={copy.title} subtitle={copy.subtitle}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {!lockRole ? (
          <label className="block text-sm font-medium text-ethio-ink">
            I am a
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as RegisterRole)}
              className="input-field"
            >
              <option value="client">Client seeking counseling</option>
              <option value="therapist">Licensed counselor</option>
            </select>
          </label>
        ) : (
          <p className="alert-success font-medium">
            Registering as: {role === "client" ? "Client" : "Licensed counselor"}
          </p>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ethio-ink">
            {t("common.firstName")}
            <input name="first_name" autoComplete="given-name" required className="input-field" />
          </label>
          <label className="block text-sm font-medium text-ethio-ink">
            {t("common.lastName")}
            <input name="last_name" autoComplete="family-name" required className="input-field" />
          </label>
        </div>

        <label className="block text-sm font-medium text-ethio-ink">
          {t("common.email")}
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            className="input-field"
          />
        </label>

        <label className="block text-sm font-medium text-ethio-ink">
          {t("register.passwordHint")}
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="input-field"
          />
        </label>

        {role === "client" && AMHARIC_UI_ENABLED && (
          <label className="block text-base font-medium text-ethio-ink">
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
        )}

        <TimezoneSelect
          value={timezone}
          onChange={setTimezone}
          detectedTimezone={detectedTimezone}
          prominent
          label={role === "therapist" ? t("register.practiceTimezone") : t("register.timezone")}
          hint={
            role === "therapist" ? t("register.practiceTimezoneHint") : t("register.timezoneHint")
          }
        />

        {role === "therapist" && (
          <>
            <label className="block text-sm font-medium text-ethio-ink">
              Specialties
              <input
                name="specializations"
                required
                placeholder="e.g. Anxiety, couples therapy, grief, trauma"
                className="input-field"
              />
              <span className="mt-1 block text-xs font-normal text-ethio-ink-muted">
                Separate multiple specialties with commas. After admin approval, these appear on your public profile.
              </span>
            </label>
            <label className="block text-sm font-medium text-ethio-ink">
              Languages you offer sessions in
              <input
                name="languages"
                required
                placeholder="e.g. English, Amharic"
                defaultValue="English, Amharic"
                className="input-field"
              />
              <span className="mt-1 block text-xs font-normal text-ethio-ink-muted">
                Separate multiple languages with commas. Include Amharic (አማርኛ) if you offer it.
              </span>
            </label>
            <label className="block text-sm font-medium text-ethio-ink">
              Organization / clinic name
              <input name="organization_name" autoComplete="organization" className="input-field" />
            </label>
          </>
        )}

        {error && (
          <p className="alert-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? t("common.pleaseWait") : copy.submitLabel}
        </button>

        <p className="text-center text-base text-ethio-ink-muted">
          {t("register.alreadyHave")}{" "}
          <a
            href={
              isSafeNextPath(nextPath)
                ? `/login?next=${encodeURIComponent(nextPath)}`
                : "/login"
            }
            className="link-inline"
          >
            {t("nav.login")}
          </a>
        </p>

        {lockRole && (
          <p className="text-center text-sm text-ethio-ink-muted">
            {role === "client" ? (
              <>
                Are you a counselor?{" "}
                <a href="/register/counselor" className="link-inline">
                  Apply as counselor
                </a>
              </>
            ) : (
              <>
                Need counseling?{" "}
                <a href="/register/client" className="link-inline">
                  Sign up as client
                </a>
              </>
            )}
          </p>
        )}
      </form>
    </AuthShell>
  );
}
