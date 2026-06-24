"use client";

type DashboardTab = "counseling" | "supervision";

type DashboardTabsProps = {
  active: DashboardTab;
  onChange: (tab: DashboardTab) => void;
  pendingCount?: number;
};

export default function DashboardTabs({ active, onChange, pendingCount = 0 }: DashboardTabsProps) {
  return (
    <div className="flex gap-2 rounded-2xl bg-ethio-surface p-1.5">
      <button
        type="button"
        onClick={() => onChange("counseling")}
        className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
          active === "counseling"
            ? "bg-white text-ethio-green-dark shadow-sm"
            : "text-ethio-ink-muted hover:text-ethio-ink"
        }`}
      >
        Counseling
      </button>
      <button
        type="button"
        onClick={() => onChange("supervision")}
        className={`relative flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
          active === "supervision"
            ? "bg-white text-ethio-green-dark shadow-sm"
            : "text-ethio-ink-muted hover:text-ethio-ink"
        }`}
      >
        Supervision
        {pendingCount > 0 && (
          <span className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-ethio-red px-1.5 py-0.5 text-[10px] font-bold text-white">
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
      </button>
    </div>
  );
}
