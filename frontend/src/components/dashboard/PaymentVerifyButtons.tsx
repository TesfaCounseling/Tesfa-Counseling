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

/** View Receipt (loudest) → Approve Payment → Reject. Stacks on 390px, same order. */
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
    <div className="flex w-full min-w-0 max-w-full flex-col gap-2 overflow-x-hidden sm:flex-row sm:flex-wrap sm:items-center">
      {canViewReceipt && onViewReceipt && (
        <button
          type="button"
          className="btn-cta !min-w-0 w-full max-w-full text-lg sm:flex-1"
          onClick={() => onViewReceipt(appointmentId)}
        >
          {t("pay.viewReceipt")}
        </button>
      )}
      {canVerify && (
        <>
          <button
            type="button"
            className="btn-primary w-full min-h-[48px] min-w-0 max-w-full px-4 py-2 text-base sm:w-auto sm:flex-none"
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
            className="btn-secondary w-full min-h-[44px] min-w-0 max-w-full px-3 py-2 text-base sm:w-auto sm:flex-none"
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
