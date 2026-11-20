"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import type { Appointment } from "@/lib/api";
import { clientPaymentsNeedingAction } from "@/lib/paymentAlerts";
import { appointmentTimezoneLabel, formatAppointmentWhen } from "@/lib/format";

type ClientPaymentStatusBannerProps = {
  appointments: Appointment[];
  clientId?: string | null;
};

export default function ClientPaymentStatusBanner({
  appointments,
  clientId,
}: ClientPaymentStatusBannerProps) {
  const { t } = useLanguage();
  const { due, awaiting } = clientPaymentsNeedingAction(appointments, clientId);
  if (due.length === 0 && awaiting.length === 0) return null;

  return (
    <div className="payment-action-banner border-b-4 border-black bg-[#9a3412] text-white" role="status">
      <div className="mx-auto box-border max-w-5xl min-w-0 page-pad py-4">
        {due.length > 0 && (
          <section className="min-w-0 max-w-full">
            <p className="text-base font-extrabold leading-snug sm:text-lg">{t("pay.uploadReceiptBanner")}</p>
            <ul className="mt-3 space-y-3">
              {due.map((appt) => (
                <li key={appt.id} className="min-w-0 max-w-full rounded-xl bg-black/25 p-3 text-base">
                  {appt.payment_reference && (
                    <p className="font-mono font-extrabold tracking-wide [overflow-wrap:anywhere]">
                      {appt.payment_reference}
                    </p>
                  )}
                  <p className="mt-1 font-semibold [overflow-wrap:anywhere]">
                    {formatAppointmentWhen(appt, false)}
                  </p>
                  <p className="mt-0.5 text-base font-medium text-white/90 [overflow-wrap:anywhere]">
                    {appointmentTimezoneLabel(appt, false)}
                  </p>
                  <Link
                    href={`/appointments/${appt.id}/pay`}
                    className="mt-3 inline-flex min-h-[48px] min-w-0 max-w-full items-center text-base font-extrabold underline decoration-2 underline-offset-2 [overflow-wrap:anywhere]"
                  >
                    {t("pay.completePayment")}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {awaiting.length > 0 && (
          <section className={`min-w-0 max-w-full ${due.length > 0 ? "mt-4" : ""}`}>
            <p className="text-base font-extrabold leading-snug sm:text-lg">
              {t("pay.awaitingCounselorBanner")}
            </p>
            <ul className="mt-3 space-y-3">
              {awaiting.map((appt) => (
                <li key={appt.id} className="min-w-0 max-w-full rounded-xl bg-black/25 p-3 text-base">
                  {appt.payment_reference && (
                    <p className="font-mono font-extrabold tracking-wide [overflow-wrap:anywhere]">
                      {appt.payment_reference}
                    </p>
                  )}
                  <p className="mt-1 font-semibold [overflow-wrap:anywhere]">
                    {formatAppointmentWhen(appt, false)}
                  </p>
                  <p className="mt-0.5 text-base font-medium text-white/90 [overflow-wrap:anywhere]">
                    {appointmentTimezoneLabel(appt, false)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
