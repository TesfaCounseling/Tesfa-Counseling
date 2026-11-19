"use client";

import { useLanguage } from "@/components/LanguageProvider";

type PaymentVerifyButtonsProps = {
  appointmentId: string;
  busyId: string | null;
  canViewReceipt?: boolean;
  canVerify?: boolean;
  onViewReceipt?: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
};

/** Three real buttons: View Receipt (loudest) → Approve Payment → Reject (danger). Stacks at 390px. */
export default function PaymentVerifyButtons({
  appointmentId,
  busyId,
  canViewReceipt = false,
  canVerify = true,
  onViewReceipt,
  onApprove,
  onReject,
}: PaymentVerifyButtonsProps) {
  const { t } = useLanguage();
  const busy = Boolean(busyId);
  const thisBusy = busyId === appointmentId;

  if (!canViewReceipt && !canVerify) return null;

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
      {canViewReceipt && onViewReceipt && (
        <button
          type="button"
          className="btn-cta !min-w-0 box-border w-full max-w-full shrink text-lg sm:flex-[1.4]"
          onClick={() => onViewReceipt(appointmentId)}
        >
          {t("pay.viewReceipt")}
        </button>
      )}
      {canVerify && (
        <>
          <button
            type="button"
            className="btn-primary !min-w-0 box-border w-full max-w-full shrink px-4 text-base sm:flex-1"
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
            className="btn-danger !min-w-0 box-border w-full max-w-full shrink px-4 text-base sm:flex-1"
            disabled={busy}
            onClick={() => onReject(appointmentId)}
          >
            {t("pay.reject")}
          </button>
        </>
      )}
    </div>
  );
}
