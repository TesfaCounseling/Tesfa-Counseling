"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { Appointment } from "@/lib/api";
import { formatTranslation } from "@/lib/i18n";
import { counselorPaymentsNeedingVerification } from "@/lib/paymentAlerts";
import { appointmentTimezoneLabel, formatAppointmentWhen } from "@/lib/format";
import PaymentVerifyButtons from "@/components/dashboard/PaymentVerifyButtons";

type CounselorPaymentActionBannerProps = {
  appointments: Appointment[];
  providerId?: string | null;
  paymentBusyId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onOpenReceipt: (id: string) => void;
  paymentError?: string;
};

export default function CounselorPaymentActionBanner({
  appointments,
  providerId,
  paymentBusyId,
  onApprove,
  onReject,
  onOpenReceipt,
  paymentError,
}: CounselorPaymentActionBannerProps) {
  const { language } = useLanguage();
  const pending = counselorPaymentsNeedingVerification(appointments, providerId);
  if (pending.length === 0) return null;

  return (
    <div
      className="sticky top-0 z-40 min-w-0 overflow-x-hidden border-b-4 border-black bg-[#9a3412] text-white"
      role="alert"
    >
      <div className="mx-auto max-w-5xl min-w-0 page-pad py-4">
        <p className="text-base font-extrabold leading-snug sm:text-lg">
          {formatTranslation(language, "pay.actionNeededBanner", { count: pending.length })}
        </p>
        {paymentError && (
          <p className="mt-2 rounded-lg bg-black/30 p-2 text-base font-semibold" role="alert">
            {paymentError}
          </p>
        )}
        <ul className="mt-3 space-y-3">
          {pending.map((appt) => (
            <li
              key={appt.id}
              className="min-w-0 overflow-x-hidden rounded-xl bg-black/25 p-3 text-base"
            >
              {appt.payment_reference && (
                <p className="break-all font-mono font-extrabold tracking-wide">{appt.payment_reference}</p>
              )}
              <p className="mt-1 break-words font-bold">{appt.client_name || "Client"}</p>
              <p className="mt-1 break-words font-semibold">
                {formatAppointmentWhen(appt, true)}
              </p>
              <p className="mt-0.5 break-words text-base font-medium text-white/90">
                {appointmentTimezoneLabel(appt, true)}
              </p>
              {appt.payment_receipt_filename && (
                <p className="mt-1 break-all text-base font-medium text-white/90">{appt.payment_receipt_filename}</p>
              )}
              <div className="mt-3 min-w-0">
                <PaymentVerifyButtons
                  appointmentId={appt.id}
                  busyId={paymentBusyId}
                  canViewReceipt={Boolean(appt.payment_receipt_uploaded)}
                  canVerify
                  onViewReceipt={onOpenReceipt}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
