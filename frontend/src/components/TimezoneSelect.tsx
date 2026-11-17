"use client";

import { timezoneOptions } from "@/lib/format";

type TimezoneSelectProps = {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  emptyLabel?: string;
  detectedTimezone?: string;
  prominent?: boolean;
};

export default function TimezoneSelect({
  name = "timezone",
  value,
  onChange,
  label,
  hint,
  required = true,
  className = "input-field",
  emptyLabel = "Select your timezone",
  detectedTimezone,
  prominent = false,
}: TimezoneSelectProps) {
  const options = timezoneOptions(detectedTimezone || value);

  const field = (
    <label className="block text-sm font-medium text-ethio-ink">
      {label}
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={className}
      >
        {!value && (
          <option value="" disabled>
            {emptyLabel}
          </option>
        )}
        {detectedTimezone && (
          <option value={detectedTimezone}>
            Detected on this device: {detectedTimezone.replace(/_/g, " ")}
          </option>
        )}
        {options
          .filter((tz) => tz !== detectedTimezone)
          .map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, " ")}
            </option>
          ))}
      </select>
      {hint ? <span className="mt-1 block text-xs font-normal text-ethio-ink-muted">{hint}</span> : null}
    </label>
  );

  if (!prominent) return field;

  return (
    <div className="rounded-xl border-2 border-ethio-green bg-ethio-surface-warm p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-ethio-green-dark">Required</p>
      <div className="mt-2">{field}</div>
    </div>
  );
}
