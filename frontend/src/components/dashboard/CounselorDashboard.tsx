"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import type { Appointment, AuthUser, ProviderProfile } from "@/lib/api";
import { getMyProviderProfile } from "@/lib/api";
import {
  appointmentTimezoneLabel,
  formatAppointmentWhen,
  formatMoney,
  formatPaymentMethod,
} from "@/lib/format";
import ClientScheduleAlerts from "@/components/dashboard/ClientScheduleAlerts";
import PaymentVerifyButtons from "@/components/dashboard/PaymentVerifyButtons";

type CounselorDashboardProps = {
  user: AuthUser | null;
  appointments: Appointment[];
  loadingSessions: boolean;
  error: string;
  onCancel: (id: string) => void;
  onDismissScheduleAlert: (id: string) => void;
  paymentBusyId: string | null;
  paymentError: string;
  onApprovePayment: (id: string) => void;
  onRejectPayment: (id: string) => void;
  onOpenReceipt: (id: string) => void;
};

export default function CounselorDashboard({
  user,
  appointments,
  loadingSessions,
  error,
  onCancel,
  onDismissScheduleAlert,
  paymentBusyId,
  paymentError,
  onApprovePayment,
  onRejectPayment,
  onOpenReceipt,
}: CounselorDashboardProps) {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [referenceQuery, setReferenceQuery] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    getMyProviderProfile()
      .then((data) => setProfile(data.profile))
      .catch(() => {});
  }, [user?.id]);

  const approvalStatus = (profile?.approval_status || "").toLowerCase();
  const approvalCopy =
    approvalStatus === "approved"
      ? t("dashboard.approval.approved")
      : approvalStatus === "rejected"
        ? t("dashboard.approval.rejected")
        : approvalStatus === "suspended"
          ? t("dashboard.approval.suspended")
          : approvalStatus
            ? t("dashboard.approval.pending")
            : "";

  const allProviderAppointments = appointments.filter((appt) => appt.provider_id === user?.id);
  const referenceNeedle = referenceQuery.trim().toLowerCase();
  const providerAppointments = referenceNeedle
    ? allProviderAppointments.filter((appt) =>
        (appt.payment_reference || "").toLowerCase().includes(referenceNeedle)
      )
    : allProviderAppointments;

  return (
    <>
      {approvalCopy && (
        <div className="card-vibrant mb-6 p-4">
          <p className="text-base font-semibold text-ethio-ink">{t("dashboard.approvalLabel")}</p>
          <p
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-base font-bold capitalize ${
              approvalStatus === "approved"
                ? "bg-ethio-green/15 text-ethio-green-dark"
                : approvalStatus === "rejected" || approvalStatus === "suspended"
                  ? "bg-red-100 text-ethio-red"
                  : "bg-amber-100 text-amber-900"
            }`}
          >
            {approvalStatus}
          </p>
          <p className="mt-2 text-base text-ethio-ink-muted">{approvalCopy}</p>
        </div>
      )}

      {user?.account_type === "trainee" && profile?.supervisor_name && (
        <div className="card-vibrant mb-6 p-4">
          <p className="text-base font-semibold text-ethio-ink-muted">Your supervisor</p>
          <p className="mt-1 text-base font-semibold text-ethio-ink">{profile.supervisor_name}</p>
          {profile.supervisor_email && (
            <p className="text-base text-ethio-ink-muted">{profile.supervisor_email}</p>
          )}
        </div>
      )}

      {user?.account_type === "trainee" && profile && !profile.supervisor_name && (
        <div className="card-vibrant mb-6 p-4">
          <p className="text-sm text-ethio-ink-muted">
            A supervisor will be assigned when your application is approved.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/provider/profile" className="card-vibrant flex min-h-[80px] items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ethio-gradient text-lg text-white shadow-ethio">
            ✏️
          </span>
          <span className="text-base font-semibold text-ethio-green-dark">Edit profile</span>
        </Link>
        <Link href="/provider/schedule" className="card-vibrant flex min-h-[80px] items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ethio-gold-warm text-lg">
            📅
          </span>
          <span className="text-base font-semibold text-ethio-ink">Manage schedule</span>
        </Link>
        <Link href="/provider/payout" className="card-vibrant flex min-h-[80px] items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ethio-surface text-lg">
            🏦
          </span>
          <span className="text-base font-semibold text-ethio-ink">{t("payout.title")}</span>
        </Link>
        <Link href="/provider/notes" className="card-vibrant flex min-h-[80px] items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ethio-surface text-lg">
            📋
          </span>
          <span className="text-base font-semibold text-ethio-ink">Session notes</span>
        </Link>
        {user?.account_type === "trainee" && (
          <Link href="/provider/intakes" className="card-vibrant flex min-h-[80px] items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ethio-surface text-lg">
              📝
            </span>
            <span className="text-base font-semibold text-ethio-ink">Client intakes</span>
          </Link>
        )}
      </div>

      <ClientScheduleAlerts
        appointments={allProviderAppointments}
        onDismiss={onDismissScheduleAlert}
        perspective="provider"
      />

      <section className="mt-10">
        <h2 className="text-lg font-bold text-ethio-ink">Upcoming sessions</h2>
        <label className="mt-3 block min-w-0 text-base font-medium text-ethio-ink">
          {t("pay.searchByReference")}
          <input
            type="search"
            value={referenceQuery}
            onChange={(e) => setReferenceQuery(e.target.value)}
            placeholder="TESFA-XXXXXX"
            className="input-field text-base"
            autoComplete="off"
          />
        </label>
        {paymentError && <p className="mt-3 alert-error">{paymentError}</p>}
        {loadingSessions && <p className="mt-3 text-sm text-ethio-ink-muted">Loading sessions…</p>}
        {error && (
          <div className="mt-3 space-y-2">
            <p className="alert-error">{error}</p>
            {error.toLowerCase().includes("session expired") && (
              <Link href="/login?next=/dashboard" className="link-inline text-sm">
                Log in again
              </Link>
            )}
          </div>
        )}
        <div className="mt-4 space-y-3">
          {providerAppointments.map((appt) => (
            <div key={appt.id} className="card-vibrant p-4">
              <p className="font-semibold text-ethio-ink">{formatAppointmentWhen(appt, true)}</p>
              <p className="text-xs text-ethio-ink-muted">{appointmentTimezoneLabel(appt, true)}</p>
              <p className="text-sm text-ethio-ink-muted">
                {appt.client_name || "Client"}
                {" · "}
                {appt.duration_minutes} min ·{" "}
                {appt.payment_status === "pending" || appt.payment_status === "submitted"
                  ? t("pay.awaitingVerification")
                  : appt.payment_status === "rejected"
                    ? t("pay.status.rejected")
                    : appt.payment_status === "verified"
                      ? t("pay.paidConfirmed")
                      : appt.status}
                {appt.session_mode === "audio_only" && " · Audio"}
              </p>
              <p className="text-xs text-ethio-ink-muted">{formatMoney(appt.amount_cents, appt.currency)}</p>
              {appt.payment_status &&
                appt.payment_status !== "not_required" &&
                (appt.payment_status !== "verified" ||
                  Boolean(appt.payment_method || appt.payment_reference || appt.payment_receipt_uploaded)) && (
                <div className="mt-3 min-w-0 overflow-x-hidden rounded-xl bg-ethio-surface p-3 text-base text-ethio-ink">
                  <p className="text-base font-bold uppercase tracking-wide text-ethio-ink-muted">
                    {t("pay.paymentRecord")}
                  </p>
                  <p className="mt-1 font-semibold text-ethio-green-dark">
                    {appt.payment_status === "verified"
                      ? t("pay.approved")
                      : appt.payment_status === "submitted" || appt.payment_status === "pending"
                        ? t("pay.awaitingVerification")
                        : t(`pay.status.${appt.payment_status}` as "pay.status.pending")}
                  </p>
                  {formatPaymentMethod(appt.payment_method) && (
                    <p className="mt-1">
                      {t("pay.methodLabel")}: {formatPaymentMethod(appt.payment_method)}
                    </p>
                  )}
                  {appt.payment_client_note && (
                    <p className="mt-1 break-words text-ethio-ink-muted">{appt.payment_client_note}</p>
                  )}
                  {appt.payment_reference && (
                    <p className="mt-2 min-w-0">
                      {t("pay.reference")}:{" "}
                      <span className="break-all font-mono font-bold tracking-wide">
                        {appt.payment_reference}
                      </span>
                    </p>
                  )}
                  {appt.payment_receipt_filename && (
                    <p className="mt-1 break-all text-base text-ethio-ink-muted">{appt.payment_receipt_filename}</p>
                  )}
                </div>
              )}
              <div className="mt-3 flex min-w-0 flex-col gap-3">
                {(appt.payment_status === "submitted" || appt.payment_receipt_uploaded) && (
                  <PaymentVerifyButtons
                    appointmentId={appt.id}
                    busyId={paymentBusyId}
                    canViewReceipt={Boolean(appt.payment_receipt_uploaded)}
                    canVerify={appt.payment_status === "submitted"}
                    onViewReceipt={onOpenReceipt}
                    onApprove={onApprovePayment}
                    onReject={onRejectPayment}
                  />
                )}
                <div className="flex flex-wrap gap-3">
                {appt.can_join_video && appt.video_room_url && (
                  <a
                    href={appt.video_room_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary text-sm"
                  >
                    {appt.session_mode === "audio_only" ? "Join audio session" : "Join video session"}
                  </a>
                )}
                {appt.video_room_ready && !appt.can_join_video && (
                  <span className="text-xs text-ethio-ink-muted">
                    {appt.session_mode === "audio_only" ? "Audio" : "Video"} opens 15 minutes before session
                  </span>
                )}
                {!appt.video_room_ready && (
                  <span className="text-xs text-ethio-ink-muted">
                    Join link appears 15 minutes before start when{" "}
                    {appt.session_mode === "audio_only" ? "audio" : "video"} is enabled.
                  </span>
                )}
                <Link
                  href={`/counselors/${appt.provider_id}/book?reschedule=${appt.id}`}
                  className="text-sm font-semibold text-ethio-green-dark"
                >
                  Reschedule
                </Link>
                <button type="button" onClick={() => onCancel(appt.id)} className="text-sm font-semibold text-ethio-red">
                  Cancel
                </button>
                </div>
              </div>
            </div>
          ))}
          {!loadingSessions && !error && providerAppointments.length === 0 && (
            <div className="card-vibrant p-5 text-center">
              <p className="font-medium text-ethio-ink">
                {referenceNeedle ? "No sessions match that payment reference" : "No upcoming sessions"}
              </p>
              <p className="mt-1 text-base text-ethio-ink-muted">
                {referenceNeedle ? "Try a different TESFA reference." : "Your schedule is clear for now."}
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
