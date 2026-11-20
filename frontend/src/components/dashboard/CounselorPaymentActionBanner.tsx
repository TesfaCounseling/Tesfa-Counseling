"use client";

import { useState } from "react";
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
  const [expanded, setExpanded] = useState(pending.length === 1);
  if (pending.length === 0) return null;

  return (
    <div className="payment-action-banner border-b-4 border-black bg-[#9a3412] text-white" role="alert">
      <div className="mx-auto box-border max-w-5xl min-w-0 page-pad py-3">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <p className="min-w-0 flex-1 text-base font-extrabold leading-snug sm:text-lg">
            {formatTranslation(language, "pay.actionNeededBanner", { count: pending.length })}
          </p>
          {pending.length > 1 && (
            <button
              type="button"
              className="min-h-[44px] shrink-0 rounded-lg bg-black/30 px-3 text-base font-bold underline-offset-2 hover:underline"
              aria-expanded={expanded}
              onClick={() => setExpanded((open) => !open)}
            >
              {expanded ? "Hide details" : "Review payments"}
            </button>
          )}
        </div>
        {paymentError && (
          <p className="mt-2 rounded-lg bg-black/30 p-2 text-base font-semibold" role="alert">
            {paymentError}
          </p>
        )}
        {expanded && (
          <ul className="mt-3 max-h-[40vh] space-y-3 overflow-y-auto overscroll-contain">
            {pending.map((appt) => (
              <li key={appt.id} className="min-w-0 max-w-full rounded-xl bg-black/25 p-3 text-base">
                {appt.payment_reference && (
                  <p className="font-mono font-extrabold tracking-wide [overflow-wrap:anywhere]">
                    {appt.payment_reference}
                  </p>
                )}
                <p className="mt-1 font-bold [overflow-wrap:anywhere]">{appt.client_name || "Client"}</p>
                <p className="mt-1 font-semibold [overflow-wrap:anywhere]">
                  {formatAppointmentWhen(appt, true)}
                </p>
                <p className="mt-0.5 text-base font-medium text-white/90 [overflow-wrap:anywhere]">
                  {appointmentTimezoneLabel(appt, true)}
                </p>
                {appt.payment_receipt_filename && (
                  <p className="mt-1 text-base font-medium text-white/90 [overflow-wrap:anywhere]">
                    {appt.payment_receipt_filename}
                  </p>
                )}
                <div className="mt-3 min-w-0 max-w-full">
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
        )}
      </div>
    </div>
  );
}
