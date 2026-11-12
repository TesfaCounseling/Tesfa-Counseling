"use client";

import { FormEvent, useState } from "react";
import AuthShell from "@/components/AuthShell";
import { useLanguage } from "@/components/LanguageProvider";
import { requestPasswordReset } from "@/lib/api";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    try {
      const result = await requestPasswordReset(String(form.get("email")));
      setSuccess(result.message || t("forgot.success"));
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("forgot.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t("forgot.title")} subtitle={t("forgot.subtitle")}>
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

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? t("forgot.sending") : t("forgot.submit")}
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
