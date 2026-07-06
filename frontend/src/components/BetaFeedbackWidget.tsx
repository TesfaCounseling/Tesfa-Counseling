"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { hasAuthSession, submitTestingFeedback, type TestingFeedbackType } from "@/lib/api";

const ENABLED = process.env.NEXT_PUBLIC_BETA_FEEDBACK === "true";

const TYPE_OPTIONS: { value: TestingFeedbackType; label: string }[] = [
  { value: "change", label: "Change something" },
  { value: "bug", label: "Bug / broken" },
  { value: "add_feature", label: "Add something" },
  { value: "confusing", label: "Confusing" },
  { value: "other", label: "Other" },
];

export default function BetaFeedbackWidget() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<TestingFeedbackType>("change");
  const [submitterName, setSubmitterName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoggedIn(hasAuthSession());
  }, [pathname]);

  if (!ENABLED) {
    return null;
  }

  const pageTitle = typeof document !== "undefined" ? document.title.replace(/\s*·.*$/, "").trim() : "";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await submitTestingFeedback({
        feedback_type: feedbackType,
        page_path: pathname,
        page_title: pageTitle,
        message,
        submitter_name: loggedIn ? undefined : submitterName.trim(),
      });
      setMessage("");
      if (!loggedIn) {
        setSubmitterName("");
      }
      setSuccess("Thanks — we got it!");
      setTimeout(() => {
        setOpen(false);
        setSuccess("");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send feedback");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+5.75rem)] z-[100] flex justify-end px-3 sm:top-[calc(var(--safe-top)+3.75rem)] sm:px-4"
        aria-hidden={open}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pointer-events-auto flex max-w-[min(100%,18rem)] flex-col items-start gap-0.5 rounded-2xl border-2 border-ethio-gold bg-ethio-green px-5 py-3.5 text-left text-white shadow-ethio ring-4 ring-ethio-gold/30 transition hover:bg-ethio-green-dark sm:max-w-xs sm:px-6 sm:py-4"
          aria-label="Testing feedback"
        >
          <span className="text-base font-extrabold leading-tight sm:text-lg">Testing feedback</span>
          <span className="text-xs font-medium text-white/90 sm:text-sm">Tap here — tell us what to change</span>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="beta-feedback-title"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-6"
          >
            <div className="mb-4">
              <h2 id="beta-feedback-title" className="text-xl font-bold text-ethio-ink sm:text-2xl">
                Testing feedback
              </h2>
              <p className="mt-1 text-sm text-ethio-ink-muted">
                Tell us what to change or add on this page. Paste text if that&apos;s easier.
                {!loggedIn && " No account needed — just add your name."}
              </p>
            </div>

            <div className="mb-3 rounded-xl bg-ethio-surface-warm px-3 py-2 text-sm">
              <p className="font-semibold text-ethio-ink">This page</p>
              <p className="mt-0.5 break-all font-mono text-xs text-ethio-ink-muted">{pathname}</p>
              {pageTitle && <p className="mt-1 text-xs text-ethio-ink-muted">{pageTitle}</p>}
            </div>

            {!loggedIn && (
              <div className="mb-3">
                <label htmlFor="beta-feedback-name" className="text-sm font-semibold text-ethio-ink">
                  Your name
                </label>
                <input
                  id="beta-feedback-name"
                  type="text"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  required
                  maxLength={120}
                  placeholder="So we know who sent this"
                  className="mt-1 w-full rounded-xl border border-ethio-border px-3 py-2 text-sm"
                />
              </div>
            )}

            <div className="mb-3">
              <label htmlFor="beta-feedback-type" className="text-sm font-semibold text-ethio-ink">
                Type
              </label>
              <select
                id="beta-feedback-type"
                value={feedbackType}
                onChange={(e) => setFeedbackType(e.target.value as TestingFeedbackType)}
                className="mt-1 w-full rounded-xl border border-ethio-border px-3 py-2 text-sm"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="beta-feedback-message" className="text-sm font-semibold text-ethio-ink">
                Your notes
              </label>
              <textarea
                id="beta-feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={6}
                maxLength={8000}
                placeholder="Paste or type what should change…"
                className="mt-1 w-full rounded-xl border border-ethio-border px-3 py-2 text-sm"
              />
            </div>

            {error && <p className="mb-3 alert-error">{error}</p>}
            {success && <p className="mb-3 alert-success">{success}</p>}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-ethio-border px-4 py-2 text-sm font-semibold text-ethio-ink-muted"
              >
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary text-sm disabled:opacity-60">
                {submitting ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
