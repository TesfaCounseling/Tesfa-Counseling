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
};

export default function TimezoneSelect({
  name = "timezone",
  value,
  onChange,
  label,
  hint,
  required = true,
  className = "input-field",
}: TimezoneSelectProps) {
  const options = timezoneOptions(value);

  return (
    <label className="block text-sm font-medium text-ethio-ink">
      {label}
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={className}
      >
        {options.map((tz) => (
          <option key={tz} value={tz}>
            {tz.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      {hint ? <span className="mt-1 block text-xs font-normal text-ethio-ink-muted">{hint}</span> : null}
    </label>
  );
}
