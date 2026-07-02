"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { Appointment } from "@/lib/api";
import { formatTranslation } from "@/lib/i18n";
import { formatAppointmentWhen } from "@/lib/format";

type Props = {
  appointments: Appointment[];
  onDismiss: (appointmentId: string) => void;
  perspective?: "client" | "provider";
};

export default function ClientScheduleAlerts({ appointments, onDismiss, perspective = "client" }: Props) {
  const { t, language } = useLanguage();
  const isProvider = perspective === "provider";
  const alerts = appointments.filter((appt) => appt.schedule_alert);

  if (alerts.length === 0) return null;

  function alertMessage(appt: Appointment): string {
    const alert = appt.schedule_alert;
    if (!alert) return "";

    const when = formatAppointmentWhen(appt, isProvider);

    if (isProvider) {
      const client = appt.client_name || t("schedule.defaultClient");
      if (alert.type === "booked") {
        return formatTranslation(language, "schedule.providerBookedMessage", { client, when });
      }
      const who = alert.changed_by_name || client;
      return formatTranslation(language, "schedule.providerRescheduledBy", { who, when });
    }

    const provider = appt.provider_name || t("schedule.defaultCounselor");

    if (alert.type === "booked") {
      return formatTranslation(language, "schedule.bookedMessage", { provider, when });
    }

    if (alert.changed_by_self) {
      return formatTranslation(language, "schedule.rescheduledSelf", { provider, when });
    }

    const who = alert.changed_by_name || provider;
    return formatTranslation(language, "schedule.rescheduledBy", { who, when });
  }

  function alertClassName(appt: Appointment): string {
    const alert = appt.schedule_alert;
    if (!alert) return "alert-success";
    if (alert.type === "rescheduled" && !alert.changed_by_self) {
      return "alert-info";
    }
    return "alert-success";
  }

  return (
    <div className="mb-6 space-y-3" role="status" aria-live="polite">
      {alerts.map((appt) => (
        <div
          key={appt.id}
          className={`${alertClassName(appt)} flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between`}
        >
          <div>
            <p className="font-semibold">
              {appt.schedule_alert?.type === "booked" ? t("schedule.bookedTitle") : t("schedule.rescheduledTitle")}
            </p>
            <p className="mt-1">{alertMessage(appt)}</p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(appt.id)}
            className="shrink-0 self-start rounded-lg border border-current/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/40"
          >
            {t("schedule.gotIt")}
          </button>
        </div>
      ))}
    </div>
  );
}
