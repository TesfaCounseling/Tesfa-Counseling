"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import AuthShell from "@/components/AuthShell";
import { syncLanguageFromProfile, useLanguage } from "@/components/LanguageProvider";
import { isAppLanguage } from "@/lib/i18n";
import { getMe, loginUser } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, setLanguage } = useLanguage();
  const nextPath = searchParams.get("next");
  const safeNext = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";
  const registerHref =
    nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
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
      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("refresh_token", result.refresh_token);
      try {
        const me = await getMe();
        if (isAppLanguage(me.user.preferred_language)) {
          setLanguage(me.user.preferred_language);
          syncLanguageFromProfile(me.user.preferred_language);
        }
      } catch {
        /* keep UI language from switcher */
      }
      router.push(safeNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t("login.title")} subtitle={t("login.subtitle")}>
      <form onSubmit={handleSubmit} className="space-y-5">
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
          {t("common.password")}
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input-field"
          />
        </label>

        {error && (
          <p className="alert-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? t("login.signingIn") : t("login.signIn")}
        </button>

        <p className="text-center text-sm text-ethio-ink-muted">
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
          <p className="text-sm text-ethio-ink-muted">Loading…</p>
        </AuthShell>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
