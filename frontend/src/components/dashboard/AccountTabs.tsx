"use client";

export type AccountTab = "platform" | "approvals" | "counseling" | "supervision";

type AccountTabsProps = {
  active: AccountTab;
  onChange: (tab: AccountTab) => void;
  showPlatform?: boolean;
  showApprovals?: boolean;
  showCounseling?: boolean;
  showSupervision?: boolean;
  pendingSupervision?: number;
};

export default function AccountTabs({
  active,
  onChange,
  showPlatform = false,
  showApprovals = false,
  showCounseling = false,
  showSupervision = false,
  pendingSupervision = 0,
}: AccountTabsProps) {
  const tabs: { id: AccountTab; label: string; badge?: number }[] = [];
  if (showPlatform) tabs.push({ id: "platform", label: "Platform" });
  if (showApprovals) tabs.push({ id: "approvals", label: "Approvals" });
  if (showCounseling) tabs.push({ id: "counseling", label: "Counseling" });
  if (showSupervision) tabs.push({ id: "supervision", label: "Supervision", badge: pendingSupervision });

  if (tabs.length <= 1) return null;

  return (
    <div className="mb-6 flex flex-wrap gap-2 rounded-2xl bg-ethio-surface p-1.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            active === tab.id
              ? "bg-white text-ethio-green-dark shadow-sm"
              : "text-ethio-ink-muted hover:text-ethio-ink"
          } ${tabs.length <= 2 ? "flex-1" : ""}`}
        >
          {tab.label}
          {tab.badge != null && tab.badge > 0 && (
            <span className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-ethio-red px-1.5 py-0.5 text-[10px] font-bold text-white">
              {tab.badge > 9 ? "9+" : tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
