"use client";

import type { Slot } from "@/lib/api";
import { parseUtcIso } from "@/lib/format";

type SlotPickerProps = {
  slots: Slot[];
  selected: Slot | null;
  onSelect: (slot: Slot) => void;
  booking: string | null;
};

function formatDayLabel(iso: string) {
  const date = parseUtcIso(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, tomorrow)) return "Tomorrow";

  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(iso: string) {
  return parseUtcIso(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function localDateKey(iso: string) {
  const date = parseUtcIso(iso);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function groupSlots(slots: Slot[]) {
  const groups = new Map<string, { label: string; sortKey: string; slots: Slot[] }>();

  for (const slot of slots) {
    const dayKey = localDateKey(slot.starts_at);
    if (!groups.has(dayKey)) {
      groups.set(dayKey, { label: formatDayLabel(slot.starts_at), sortKey: dayKey, slots: [] });
    }
    groups.get(dayKey)!.slots.push(slot);
  }

  return Array.from(groups.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

export default function SlotPicker({ slots, selected, onSelect, booking }: SlotPickerProps) {
  const groups = groupSlots(slots);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.sortKey}>
          <div className="day-group-header">
            <span className="day-group-dot" aria-hidden />
            <h3 className="text-sm font-bold uppercase tracking-wide text-ethio-green-dark">{group.label}</h3>
            <span className="text-xs font-medium text-ethio-ink-muted">
              {group.slots.length} open {group.slots.length === 1 ? "slot" : "slots"}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {group.slots.map((slot) => {
              const isSelected = selected?.starts_at === slot.starts_at;
              const isBooking = booking === slot.starts_at;

              return (
                <button
                  key={slot.starts_at}
                  type="button"
                  disabled={Boolean(booking)}
                  onClick={() => onSelect(slot)}
                  className={`slot-pill ${isSelected ? "slot-pill-selected" : ""}`}
                  aria-pressed={isSelected}
                >
                  <span className="slot-pill-time">{formatTime(slot.starts_at)}</span>
                  {isBooking ? (
                    <span className="slot-pill-meta">Booking…</span>
                  ) : isSelected ? (
                    <span className="slot-pill-meta">Selected</span>
                  ) : (
                    <span className="slot-pill-meta">{formatTime(slot.ends_at)} end</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function SlotPickerSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <div className="h-5 w-40 rounded-lg bg-ethio-surface-warm" />
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {[1, 2, 3, 4, 5, 6].map((j) => (
              <div key={j} className="h-14 rounded-xl bg-ethio-surface-warm" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
