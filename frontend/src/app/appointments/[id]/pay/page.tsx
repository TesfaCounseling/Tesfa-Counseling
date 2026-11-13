"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { useLanguage } from "@/components/LanguageProvider";
import {
  getAppointmentPayment,
  hasAuthSession,
  uploadPaymentReceipt,
  type Appointment,
  type DiasporaPaymentMethod,
  type PaymentInstructions,
} from "@/lib/api";
import { formatMoney } from "@/lib/format";

const METHODS: { value: DiasporaPaymentMethod; labelKey: string }[] = [
  { value: "remitly", labelKey: "pay.methodRemitly" },
  { value: "taptap", labelKey: "pay.methodTaptap" },
  { value: "wise", labelKey: "pay.methodWise" },
  { value: "western_union", labelKey: "pay.methodWesternUnion" },
  { value: "cbe", labelKey: "pay.methodCbe" },
  { value: "other", labelKey: "pay.methodOther" },
];

export default function AppointmentPayPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const appointmentId = String(params.id || "");

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [instructions, setInstructions] = useState<PaymentInstructions | null>(null);
  const [method, setMethod] = useState<DiasporaPaymentMethod>("remitly");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!hasAuthSession()) {
      router.replace(`/login?next=${encodeURIComponent(`/appointments/${appointmentId}/pay`)}`);
      return;
    }
    if (!appointmentId) return;
    setLoading(true);
    getAppointmentPayment(appointmentId)
      .then((data) => {
        setAppointment(data.appointment);
        setInstructions(data.instructions);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t("pay.loadError")))
      .finally(() => setLoading(false));
  }, [appointmentId, router, t]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError(t("pay.receiptRequired"));
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const result = await uploadPaymentReceipt(appointmentId, method, file);
      setAppointment(result.appointment);
      setSuccess(t("pay.uploadSuccess"));
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("pay.uploadError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AuthShell title={t("pay.title")} subtitle={t("common.loading")}>
        <p className="text-sm text-ethio-ink-muted">{t("common.pleaseWait")}</p>
      </AuthShell>
    );
  }

  if (!appointment || !instructions) {
    return (
      <AuthShell title={t("pay.title")} subtitle={t("pay.loadError")}>
        <p className="alert-error">{error || t("pay.loadError")}</p>
        <p className="mt-4 text-center text-sm">
          <Link href="/dashboard" className="link-inline">
            {t("nav.dashboard")}
          </Link>
        </p>
      </AuthShell>
    );
  }

  const status = appointment.payment_status || "pending";
  const isVerified = status === "verified" || status === "not_required";
  const isSubmitted = status === "submitted";

  return (
    <AuthShell title={t("pay.title")} subtitle={t("pay.subtitle")}>
      <div className="space-y-5">
        <div className="rounded-xl bg-ethio-surface p-4 text-sm text-ethio-ink">
          <p className="font-semibold">{appointment.provider_name || t("dashboard.providerFallback")}</p>
          <p className="mt-1 text-ethio-ink-muted">
            {appointment.client_local_display || appointment.starts_at} · {appointment.duration_minutes}{" "}
            {t("dashboard.minutesShort")}
          </p>
          <p className="mt-3 text-lg font-bold text-ethio-green-dark">
            {formatMoney(appointment.amount_cents, appointment.currency)}
          </p>
          {appointment.payment_reference && (
            <p className="mt-2">
              {t("pay.reference")}:{" "}
              <span className="font-mono font-bold tracking-wide">{appointment.payment_reference}</span>
            </p>
          )}
          <p className="mt-2 text-xs uppercase tracking-wide text-ethio-ink-muted">
            {t(`pay.status.${status}` as "pay.status.pending")}
          </p>
        </div>

        {isVerified ? (
          <p className="alert-success" role="status">
            {t("pay.verified")}
          </p>
        ) : (
          <>
            <section className="space-y-2 text-sm text-ethio-ink">
              <h2 className="font-bold">{t("pay.sendTo")}</h2>
              <p className="font-semibold">{instructions.account_name}</p>
              <pre className="whitespace-pre-wrap rounded-lg bg-ethio-surface p-3 font-sans text-sm text-ethio-ink">
                {instructions.account_details}
              </pre>
              <p className="text-ethio-ink-muted">{instructions.notes}</p>
              <p className="text-xs text-ethio-ink-muted">
                {t("pay.acceptedMethods")}: {instructions.accepted_methods.join(", ")}
              </p>
              {instructions.local_methods_coming_soon && (
                <p className="text-xs text-ethio-ink-muted">{t("pay.localComingSoon")}</p>
              )}
            </section>

            {status === "rejected" && appointment.payment_rejection_reason && (
              <p className="alert-error" role="alert">
                {t("pay.rejected")}: {appointment.payment_rejection_reason}
              </p>
            )}

            {isSubmitted ? (
              <p className="alert-success" role="status">
                {t("pay.waitingReview")}
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block text-sm font-medium text-ethio-ink">
                  {t("pay.method")}
                  <select
                    className="input-field"
                    value={method}
                    onChange={(e) => setMethod(e.target.value as DiasporaPaymentMethod)}
                  >
                    {METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {t(m.labelKey)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-ethio-ink">
                  {t("pay.receipt")}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="input-field"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    required
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
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? t("pay.uploading") : t("pay.upload")}
                </button>
              </form>
            )}
          </>
        )}

        <p className="text-center text-sm text-ethio-ink-muted">
          <Link href="/dashboard" className="link-inline">
            {t("pay.backDashboard")}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
