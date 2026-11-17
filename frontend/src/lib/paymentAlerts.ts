import type { Appointment } from "./api";

/** Receipt uploaded; counselor must approve or reject. */
export function isAwaitingCounselorVerification(appt: Appointment): boolean {
  return appt.payment_status === "submitted";
}

/** Client still needs to upload (or re-upload) a receipt. */
export function isClientPaymentDue(appt: Appointment): boolean {
  return appt.payment_required === true || appt.payment_status === "pending" || appt.payment_status === "rejected";
}

export function counselorPaymentsNeedingVerification(
  appointments: Appointment[],
  providerId?: string | null
): Appointment[] {
  if (!providerId) return [];
  return appointments.filter(
    (appt) => appt.provider_id === providerId && isAwaitingCounselorVerification(appt)
  );
}

export function clientPaymentsNeedingAction(
  appointments: Appointment[],
  clientId?: string | null
): { due: Appointment[]; awaiting: Appointment[] } {
  if (!clientId) return { due: [], awaiting: [] };
  const mine = appointments.filter((appt) => appt.client_id === clientId);
  return {
    due: mine.filter(isClientPaymentDue),
    awaiting: mine.filter(isAwaitingCounselorVerification),
  };
}
