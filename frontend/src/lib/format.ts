/** Parse API datetimes as UTC instants (SQLite often omits timezone suffix). */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function parseUtcIso(iso: string): Date {
  const trimmed = iso.trim();
  if (!trimmed) return new Date(NaN);
  if (/[zZ]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }
  return new Date(`${trimmed}Z`);
}

export function formatDateTime(iso: string, timeZone?: string) {
  return parseUtcIso(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  });
}

export function formatAppointmentWhen(
  appt: {
    starts_at: string;
    client_local_display?: string;
    provider_local_display?: string;
    client_timezone?: string;
    provider_timezone?: string;
  },
  asProvider: boolean
) {
  if (asProvider && appt.provider_local_display) {
    return appt.provider_local_display;
  }
  if (!asProvider && appt.client_local_display) {
    return appt.client_local_display;
  }
  return formatDateTime(appt.starts_at);
}

export function appointmentTimezoneLabel(appt: { client_timezone?: string; provider_timezone?: string }, asProvider: boolean) {
  return asProvider ? appt.provider_timezone || getBrowserTimezone() : appt.client_timezone || getBrowserTimezone();
}

export function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function formatPricingType(type: string) {
  const labels: Record<string, string> = {
    standard: "Standard rate",
    pro_bono: "Pro bono",
    sliding_scale: "Sliding scale",
    trainee_rate: "Trainee rate",
  };
  return labels[type] || formatStatusLabel(type);
}
