"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import type { Appointment } from "@/lib/api";
import { formatTranslation } from "@/lib/i18n";
import { appointmentTimezoneLabel, formatAppointmentWhen, formatMoney } from "@/lib/format";

type ClientSessionsListProps = {
  appointments: Appointment[];
  loading: boolean;
  error: string;
  emptyTitleKey?: "dashboard.noSessions" | "schedule.noPastSessions";
  emptyHintKey?: "dashboard.noSessionsHint" | "schedule.noPastSessionsHint";
  onCancel: (id: string) => void;
  showActions?: boolean;
};

export default function ClientSessionsList({
  appointments,
  loading,
  error,
  emptyTitleKey = "dashboard.noSessions",
  emptyHintKey = "dashboard.noSessionsHint",
  onCancel,
  showActions = true,
}: ClientSessionsListProps) {
  const { t, language } = useLanguage();

  if (loading) {
    return <p className="mt-3 text-sm text-ethio-ink-muted">{t("dashboard.loadingSessions")}</p>;
  }

  if (error) {
    return (
      <div className="mt-3 space-y-2">
        <p className="alert-error">{error}</p>
        {error.toLowerCase().includes("session expired") && (
          <Link href="/login?next=/schedule" className="link-inline text-sm">
            {t("dashboard.logInAgain")}
          </Link>
        )}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="card-vibrant mt-4 p-5 text-center">
        <p className="font-medium text-ethio-ink">{t(emptyTitleKey)}</p>
        <p className="mt-1 text-sm text-ethio-ink-muted">{t(emptyHintKey)}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {appointments.map((appt) => (
        <div key={appt.id} className="card-vibrant p-4">
          <p className="font-semibold text-ethio-ink">{formatAppointmentWhen(appt, false)}</p>
          <p className="text-xs text-ethio-ink-muted">{appointmentTimezoneLabel(appt, false)}</p>
          <p className="text-sm text-ethio-ink-muted">
            {appt.provider_name || t("dashboard.providerFallback")}
            {appt.client_name ? ` · ${appt.client_name}` : ""} · {appt.duration_minutes}{" "}
            {t("dashboard.minutesShort")} · {appt.status}
            {appt.session_mode === "audio_only" && ` · ${t("dashboard.audio")}`}
          </p>
          <p className="text-xs text-ethio-ink-muted">{formatMoney(appt.amount_cents, appt.currency)}</p>
          {showActions && (
            <div className="mt-3 flex flex-wrap gap-3">
              {appt.can_join_video && appt.video_room_url && (
                <a
                  href={appt.video_room_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-sm"
                >
                  {appt.session_mode === "audio_only" ? t("dashboard.joinAudio") : t("dashboard.joinVideo")}
                </a>
              )}
              {appt.video_room_ready && !appt.can_join_video && (
                <span className="text-xs text-ethio-ink-muted">
                  {formatTranslation(language, "dashboard.sessionOpensBefore", {
                    mode: appt.session_mode === "audio_only" ? t("dashboard.audio") : t("dashboard.video"),
                  })}
                </span>
              )}
              {!appt.video_room_ready && (
                <span className="text-xs text-ethio-ink-muted">{t("dashboard.videoLinkPending")}</span>
              )}
              <Link
                href={`/counselors/${appt.provider_id}/book?reschedule=${appt.id}`}
                className="text-sm font-semibold text-ethio-green-dark"
              >
                {t("dashboard.reschedule")}
              </Link>
              <button
                type="button"
                onClick={() => onCancel(appt.id)}
                className="text-sm font-semibold text-ethio-red"
              >
                {t("dashboard.cancel")}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
