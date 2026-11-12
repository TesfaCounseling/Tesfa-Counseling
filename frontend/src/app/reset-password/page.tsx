"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { useLanguage } from "@/components/LanguageProvider";
import { resetPassword } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const token = (searchParams.get("token") || "").trim();

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError(t("reset.missingToken"));
      return;
    }

    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirmPassword") || "");

    if (password.length < 8) {
      setError(t("reset.passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("reset.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(token, password);
      setSuccess(result.message || t("reset.success"));
      window.setTimeout(() => router.push("/login"), 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("reset.error"));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthShell title={t("reset.title")} subtitle={t("reset.subtitle")}>
        <p className="alert-error" role="alert">
          {t("reset.missingToken")}
        </p>
        <p className="mt-5 text-center text-sm text-ethio-ink-muted">
          <a href="/forgot-password" className="link-inline">
            {t("reset.requestNew")}
          </a>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("reset.title")} subtitle={t("reset.subtitle")}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block text-sm font-medium text-ethio-ink">
          {t("reset.newPassword")}
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="input-field"
          />
        </label>

        <label className="block text-sm font-medium text-ethio-ink">
          {t("reset.confirmPassword")}
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="input-field"
          />
        </label>

        {error && (
          <p className="alert-error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="alert-success" role="status">
            {success}
          </p>
        )}

        <button type="submit" disabled={loading || Boolean(success)} className="btn-primary">
          {loading ? t("reset.saving") : t("reset.submit")}
        </button>

        <p className="text-center text-sm text-ethio-ink-muted">
          <a href="/login" className="link-inline">
            {t("forgot.backToLogin")}
          </a>
        </p>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Reset password" subtitle="Loading…">
          <p className="text-sm text-ethio-ink-muted">Loading…</p>
        </AuthShell>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
