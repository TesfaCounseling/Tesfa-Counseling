"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import AuthShell from "@/components/AuthShell";
import { syncLanguageFromProfile, useLanguage } from "@/components/LanguageProvider";
import { isAppLanguage } from "@/lib/i18n";
import { getMe, isUnreachableApiError, loginUser } from "@/lib/api";
import { isSafeNextPath, postLoginPath } from "@/lib/safeNext";

const SIGN_IN_UNAVAILABLE =
  "We couldn't sign you in right now. Please try again in a moment.";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, setLanguage } = useLanguage();
  const nextPath = searchParams.get("next");
  const registerHref = isSafeNextPath(nextPath)
    ? `/register/client?next=${encodeURIComponent(nextPath)}`
    : "/register/client";

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    try {
      const result = await loginUser(String(form.get("email")), String(form.get("password")));
      let user = result.user;
      try {
        const me = await getMe();
        user = me.user;
        if (isAppLanguage(me.user.preferred_language)) {
          setLanguage(me.user.preferred_language);
          syncLanguageFromProfile(me.user.preferred_language);
        }
      } catch {
        /* keep UI language from switcher */
      }
      router.push(postLoginPath(nextPath, user));
    } catch (err) {
      setError(isUnreachableApiError(err) ? SIGN_IN_UNAVAILABLE : err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t("login.title")} subtitle={t("login.subtitle")}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block text-base font-medium text-ethio-ink">
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

        <label className="block text-base font-medium text-ethio-ink">
          {t("common.password")}
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input-field"
          />
        </label>

        <p className="text-right text-base">
          <a href="/forgot-password" className="link-inline">
            {t("login.forgotPassword")}
          </a>
        </p>

        {error && (
          <p className="alert-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? t("login.signingIn") : t("login.signIn")}
        </button>

        <p className="text-center text-base text-ethio-ink-muted">
          {t("login.newHere")}{" "}
          <a href={registerHref} className="link-inline">
            {t("login.createAccount")}
          </a>
        </p>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Log in" subtitle="Loading…">
          <p className="text-base text-ethio-ink-muted">Loading…</p>
        </AuthShell>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
