import type { AdminOverview } from "@/lib/api";

type AdminOverviewPanelProps = {
  stats: AdminOverview;
  onGoToApprovals: () => void;
  onGoToStatistics?: () => void;
  onGoToFeedback?: () => void;
  showCounselorPending: boolean;
  showFeedback?: boolean;
};

function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="card-vibrant p-5">
      <p className="text-sm font-medium text-ethio-ink-muted">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-ethio-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ethio-ink-muted">{hint}</p>}
    </div>
  );
}

export default function AdminOverviewPanel({
  stats,
  onGoToApprovals,
  onGoToStatistics,
  onGoToFeedback,
  showCounselorPending,
  showFeedback = false,
}: AdminOverviewPanelProps) {
  const pendingTotal = stats.pending_counselors;
  const approvedTotal = stats.approved_counselors;
  const openFeedback = stats.open_client_feedback ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending approvals" value={pendingTotal} hint="Counselors awaiting review" />
        <StatCard label="Active counselors" value={approvedTotal} hint="Approved counselors" />
        {showFeedback ? (
          <StatCard
            label="Open feedback"
            value={openFeedback}
            hint="Client messages awaiting review in the portal"
          />
        ) : (
          <StatCard label="Users" value={stats.active_users} hint={`${stats.total_users} total registered`} />
        )}
        <StatCard
          label={showFeedback ? "Users" : "Audit events (24h)"}
          value={showFeedback ? stats.active_users : stats.audit_events_24h}
          hint={showFeedback ? `${stats.total_users} total registered` : "Recent platform activity"}
        />
      </div>

      {onGoToStatistics && (
        <button type="button" onClick={onGoToStatistics} className="text-sm font-semibold text-ethio-green hover:underline">
          View full statistics →
        </button>
      )}

      {pendingTotal > 0 && (
        <div className="card-vibrant flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-semibold text-ethio-ink">Action needed</p>
            <p className="mt-1 text-sm text-ethio-ink-muted">
              {showCounselorPending && stats.pending_counselors > 0 && (
                <span>{stats.pending_counselors} counselor{stats.pending_counselors === 1 ? "" : "s"}</span>
              )}{" "}
              waiting for approval.
            </p>
          </div>
          <button type="button" onClick={onGoToApprovals} className="btn-primary text-sm">
            Review applications
          </button>
        </div>
      )}

      {showFeedback && openFeedback > 0 && onGoToFeedback && (
        <div className="alert-info flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Client feedback waiting</p>
            <p className="mt-1 text-sm">
              {openFeedback} open message{openFeedback === 1 ? "" : "s"} from clients — review in the Feedback tab.
            </p>
          </div>
          <button type="button" onClick={onGoToFeedback} className="btn-primary text-sm">
            View feedback
          </button>
        </div>
      )}
    </div>
  );
}
