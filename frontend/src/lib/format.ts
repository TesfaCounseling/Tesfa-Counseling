/** Common IANA zones for Ethiopia + diaspora booking. */
export const COMMON_TIMEZONES = [
  "Africa/Addis_Ababa",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Australia/Sydney",
  "UTC",
] as const;

/** Parse API datetimes as UTC instants (SQLite often omits timezone suffix). */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Prefer a saved profile timezone; fall back to the browser. */
export function resolveViewerTimezone(saved?: string | null): string {
  const trimmed = (saved || "").trim();
  return trimmed || getBrowserTimezone();
}

export function timezoneOptions(preferred?: string | null): string[] {
  const browser = getBrowserTimezone();
  const preferredTrimmed = (preferred || "").trim();
  return Array.from(new Set([preferredTrimmed, browser, ...COMMON_TIMEZONES].filter(Boolean)));
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

export function formatTimeInZone(iso: string, timeZone: string) {
  return parseUtcIso(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

/** Calendar date key (YYYY-MM-DD) in a specific IANA timezone. */
export function dateKeyInZone(iso: string, timeZone: string) {
  return parseUtcIso(iso).toLocaleDateString("en-CA", { timeZone });
}

export function formatDayLabelInZone(iso: string, timeZone: string) {
  const key = dateKeyInZone(iso, timeZone);
  const todayKey = dateKeyInZone(new Date().toISOString(), timeZone);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = dateKeyInZone(tomorrow.toISOString(), timeZone);
  if (key === todayKey) return "Today";
  if (key === tomorrowKey) return "Tomorrow";
  return parseUtcIso(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone,
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
  const code = (currency || "USD").toUpperCase();
  try {
    const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(cents / 100);
    return amount.includes(code) ? amount : `${amount} ${code}`;
  } catch {
    return `$${(cents / 100).toFixed(2)} ${code}`;
  }
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  remitly: "Remitly",
  taptap: "TapTap Send",
  wise: "Wise",
  western_union: "Western Union",
  cbe: "CBE",
  other: "Other",
};

export function formatPaymentMethod(method?: string | null) {
  if (!method) return "";
  const key = method.trim().toLowerCase().replace(/\s+/g, "_");
  return PAYMENT_METHOD_LABELS[key] || method.replace(/_/g, " ");
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
