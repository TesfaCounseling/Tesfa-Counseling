export type AdminSection =
  | "overview"
  | "statistics"
  | "approvals"
  | "providers"
  | "users"
  | "audit"
  | "organizations";

type Tab = { id: AdminSection; label: string; badge?: number };

type AdminTabNavProps = {
  tabs: Tab[];
  active: AdminSection;
  onChange: (section: AdminSection) => void;
};

export default function AdminTabNav({ tabs, active, onChange }: AdminTabNavProps) {
  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-ethio-border pb-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            active === tab.id
              ? "bg-ethio-green text-white shadow-ethio"
              : "border border-ethio-border bg-white text-ethio-ink-muted hover:text-ethio-ink"
          }`}
        >
          {tab.label}
          {tab.badge != null && tab.badge > 0 && (
            <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{tab.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}
