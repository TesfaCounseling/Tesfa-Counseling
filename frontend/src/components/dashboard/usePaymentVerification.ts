"use client";

import { useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  authorizedFetch,
  paymentReceiptUrl,
  verifyAppointmentPayment,
  type Appointment,
} from "@/lib/api";

export function usePaymentVerification(onUpdated?: (appointment: Appointment) => void) {
  const { t } = useLanguage();
  const [paymentBusyId, setPaymentBusyId] = useState<string | null>(null);
  const paymentBusyRef = useRef(false);
  const [paymentError, setPaymentError] = useState("");

  async function openReceipt(id: string) {
    const res = await authorizedFetch(paymentReceiptUrl(id));
    if (!res.ok) throw new Error(t("pay.loadError"));
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleVerify(id: string, action: "approve" | "reject") {
    if (paymentBusyRef.current) return;
    paymentBusyRef.current = true;
    setPaymentError("");
    let reason: string | undefined;
    if (action === "reject") {
      reason = window.prompt(t("pay.rejectReason")) || "";
      if (!reason.trim()) {
        paymentBusyRef.current = false;
        return;
      }
    }
    setPaymentBusyId(id);
    try {
      const result = await verifyAppointmentPayment(id, action, reason);
      onUpdated?.(result.appointment);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : t("pay.uploadError"));
    } finally {
      paymentBusyRef.current = false;
      setPaymentBusyId(null);
    }
  }

  return { paymentBusyId, paymentError, setPaymentError, openReceipt, handleVerify };
}
