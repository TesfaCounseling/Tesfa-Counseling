"use client";

import { FormEvent, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { submitClientFeedback, type FeedbackCategory } from "@/lib/api";

export default function ClientFeedbackForm() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("feedback");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await submitClientFeedback({ category, subject, message });
      setSubject("");
      setMessage("");
      setSuccess(t("feedback.success"));
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("feedback.sendFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-8">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="card-vibrant flex w-full items-center justify-between gap-3 p-4 text-left transition active:bg-ethio-green/5"
      >
        <span className="min-w-0">
          <span className="block text-base font-bold text-ethio-ink sm:text-lg">{t("feedback.title")}</span>
          <span className="mt-1 block text-sm text-ethio-ink-muted">{t("feedback.subtitle")}</span>
        </span>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ethio-surface-warm text-sm font-bold text-ethio-green-dark"
          aria-hidden
        >
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="card-vibrant mt-3 space-y-4 p-5">        <div>
          <p className="text-sm font-semibold text-ethio-ink">{t("feedback.type")}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="category"
                value="feedback"
                checked={category === "feedback"}
                onChange={() => setCategory("feedback")}
              />
              {t("feedback.feedback")}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="category"
                value="complaint"
                checked={category === "complaint"}
                onChange={() => setCategory("complaint")}
              />
              {t("feedback.complaint")}
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="feedback-subject" className="text-sm font-semibold text-ethio-ink">
            {t("feedback.subject")}
          </label>
          <input
            id="feedback-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            required
            className="mt-1 w-full rounded-xl border border-ethio-border px-3 py-2 text-sm"
            placeholder={t("feedback.subjectPlaceholder")}
          />
        </div>

        <div>
          <label htmlFor="feedback-message" className="text-sm font-semibold text-ethio-ink">
            {t("feedback.message")}
          </label>
          <textarea
            id="feedback-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={5000}
            required
            rows={5}
            className="mt-1 w-full rounded-xl border border-ethio-border px-3 py-2 text-sm"
            placeholder={t("feedback.messagePlaceholder")}
          />
        </div>

        {error && <p className="alert-error">{error}</p>}
        {success && <p className="alert-success">{success}</p>}

        <button type="submit" disabled={submitting} className="btn-primary text-sm disabled:opacity-60">
          {submitting ? t("feedback.sending") : t("feedback.submit")}
        </button>
        </form>
      )}
    </section>
  );
}