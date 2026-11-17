"use client";

import { useLanguage } from "@/components/LanguageProvider";

type PaymentVerifyButtonsProps = {
  appointmentId: string;
  busyId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  compact?: boolean;
};

export default function PaymentVerifyButtons({
  appointmentId,
  busyId,
  onApprove,
  onReject,
  compact = false,
}: PaymentVerifyButtonsProps) {
  const { t } = useLanguage();
  const busy = Boolean(busyId);
  const thisBusy = busyId === appointmentId;

  return (
    <div className="flex min-w-0 flex-wrap gap-3">
      <button
        type="button"
        className={
          compact
            ? "inline-flex min-h-[48px] min-w-0 max-w-full items-center justify-center rounded-xl bg-white px-4 text-base font-extrabold text-[#9a3412] disabled:opacity-50"
            : "btn-primary text-base"
        }
        disabled={busy}
        aria-busy={thisBusy}
        onClick={() => onApprove(appointmentId)}
      >
        {thisBusy ? (
          <>
            <span className="btn-spinner" aria-hidden />
            {t("pay.approving")}
          </>
        ) : (
          t("pay.approve")
        )}
      </button>
      <button
        type="button"
        className={
          compact
            ? "min-h-[48px] min-w-0 max-w-full text-base font-extrabold text-white underline decoration-2 underline-offset-2 disabled:opacity-50"
            : "min-h-[48px] text-base font-semibold text-ethio-red disabled:opacity-50"
        }
        disabled={busy}
        onClick={() => onReject(appointmentId)}
      >
        {t("pay.reject")}
      </button>
    </div>
  );
}
