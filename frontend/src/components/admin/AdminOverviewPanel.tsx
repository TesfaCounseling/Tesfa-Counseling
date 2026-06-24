import type { AdminOverview } from "@/lib/api";

type AdminOverviewPanelProps = {
  stats: AdminOverview;
  onGoToApprovals: () => void;
  onGoToStatistics?: () => void;
  showCounselorPending: boolean;
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
  showCounselorPending,
}: AdminOverviewPanelProps) {
  const pendingTotal = stats.pending_counselors + stats.pending_trainees;
  const approvedTotal = stats.approved_counselors + stats.approved_trainees;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending approvals" value={pendingTotal} hint="Counselors + trainees awaiting review" />
        <StatCard label="Active providers" value={approvedTotal} hint="Approved counselors and trainees" />
        <StatCard label="Users" value={stats.active_users} hint={`${stats.total_users} total registered`} />
        <StatCard label="Organizations" value={stats.organizations} hint={`${stats.audit_events_24h} audit events (24h)`} />
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
              )}
              {showCounselorPending && stats.pending_counselors > 0 && stats.pending_trainees > 0 && " · "}
              {stats.pending_trainees > 0 && (
                <span>{stats.pending_trainees} trainee{stats.pending_trainees === 1 ? "" : "s"}</span>
              )}{" "}
              waiting for approval.
            </p>
          </div>
          <button type="button" onClick={onGoToApprovals} className="btn-primary text-sm">
            Review applications
          </button>
        </div>
      )}
    </div>
  );
}
