"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { getAdminStatistics, type AdminStatistics } from "@/lib/api";
import { formatStatusLabel } from "@/lib/format";

function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function StatCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string | number;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`card-vibrant p-5 ${highlight ? "ring-2 ring-ethio-green/30" : ""}`}>
      <p className="text-sm font-medium text-ethio-ink-muted">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-ethio-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ethio-ink-muted">{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-ethio-ink">{title}</h2>
      {children}
    </section>
  );
}

function TrendChart({ label, data }: { label: string; data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="card-vibrant p-5">
      <p className="mb-4 text-sm font-semibold text-ethio-ink">{label}</p>
      <div className="flex items-end gap-2" style={{ height: 120 }}>
        {data.map((day) => (
          <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs font-medium text-ethio-ink">{day.count}</span>
            <div
              className="w-full rounded-t bg-ethio-green/80 transition-all"
              style={{ height: `${Math.max((day.count / max) * 80, day.count > 0 ? 8 : 2)}px` }}
              title={`${day.date}: ${day.count}`}
            />
            <span className="text-[10px] text-ethio-ink-muted">
              {new Date(day.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BreakdownTable({ rows }: { rows: { label: string; value: string | number }[] }) {
  return (
    <div className="card-vibrant overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-ethio-border last:border-0">
              <td className="px-4 py-3 text-ethio-ink-muted">{row.label}</td>
              <td className="px-4 py-3 text-right font-semibold text-ethio-ink">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminStatisticsPanel() {
  const [stats, setStats] = useState<AdminStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminStatistics();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load statistics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-ethio-ink-muted">Loading statistics…</p>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="alert-error">{error}</p>
        <button type="button" onClick={load} className="btn-secondary text-sm">
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const { users, appointments, revenue, organizations, platform, trends, top_providers } = stats;
  const cancellationRate =
    appointments.total > 0 ? Math.round((appointments.cancelled / appointments.total) * 100) : 0;
  const completionRate =
    appointments.total > 0 ? Math.round((appointments.completed / appointments.total) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ethio-ink-muted">
          Snapshot as of {new Date(stats.generated_at).toLocaleString()}
        </p>
        <button type="button" onClick={load} className="btn-secondary text-sm">
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Recorded revenue"
          value={formatMoney(revenue.total_recorded_cents)}
          hint={`${formatMoney(revenue.last_30d_cents)} in last 30 days`}
          highlight
        />
        <StatCard
          label="Total bookings"
          value={appointments.total}
          hint={`${appointments.new_7d} new this week · ${appointments.upcoming} upcoming`}
        />
        <StatCard label="Registered users" value={users.total} hint={`${users.new_30d} joined in 30 days`} />
        <StatCard
          label="Active providers"
          value={users.counselors.approved + users.trainees.approved}
          hint={`${users.counselors.pending + users.trainees.pending} pending approval`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TrendChart label="New signups (last 7 days)" data={trends.signups_daily} />
        <TrendChart label="New bookings (last 7 days)" data={trends.bookings_daily} />
      </div>

      <Section title="Revenue & pricing">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Completed session revenue" value={formatMoney(revenue.completed_cents)} />
          <StatCard
            label="Avg paid session"
            value={revenue.avg_paid_session_cents > 0 ? formatMoney(revenue.avg_paid_session_cents) : "—"}
          />
          <StatCard label="Pro bono sessions" value={revenue.pro_bono_sessions} />
          <StatCard label="Sliding scale sessions" value={revenue.sliding_scale_sessions} />
        </div>
        {revenue.by_currency.length > 0 && (
          <BreakdownTable
            rows={revenue.by_currency.map((c) => ({
              label: `${c.currency} (${c.sessions} sessions)`,
              value: formatMoney(c.total_cents, c.currency),
            }))}
          />
        )}
        <p className="text-xs text-ethio-ink-muted">
          Amounts are recorded at booking time. Payment processing (Stripe) is not yet connected — these figures
          reflect scheduled session value, not collected payments.
        </p>
      </Section>

      <Section title="Appointments">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Upcoming" value={appointments.upcoming} />
          <StatCard label="Completed" value={appointments.completed} hint={`${completionRate}% of all bookings`} />
          <StatCard label="Cancelled" value={appointments.cancelled} hint={`${cancellationRate}% cancellation rate`} />
          <StatCard label="No-shows" value={appointments.no_show} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <BreakdownTable
            rows={Object.entries(appointments.by_status).map(([k, v]) => ({
              label: formatStatusLabel(k),
              value: v,
            }))}
          />
          <BreakdownTable
            rows={Object.entries(appointments.by_pricing_type).map(([k, v]) => ({
              label: formatStatusLabel(k),
              value: v,
            }))}
          />
        </div>
        <p className="text-sm text-ethio-ink-muted">
          {appointments.with_video_room} sessions have video rooms · {appointments.new_30d} bookings in the last 30 days
        </p>
      </Section>

      <Section title="Users & providers">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Clients" value={users.clients} />
          <StatCard label="Active accounts" value={users.active} hint={`${users.inactive} inactive`} />
          <StatCard label="New this week" value={users.new_7d} />
          <StatCard label="Platform admins" value={users.platform_admins} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold text-ethio-ink">Counselors</p>
            <BreakdownTable
              rows={[
                { label: "Approved", value: users.counselors.approved },
                { label: "Pending", value: users.counselors.pending },
                { label: "Rejected", value: users.counselors.rejected },
                { label: "Suspended", value: users.counselors.suspended },
              ]}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-ethio-ink">Trainees</p>
            <BreakdownTable
              rows={[
                { label: "Approved", value: users.trainees.approved },
                { label: "Pending", value: users.trainees.pending },
                { label: "Rejected", value: users.trainees.rejected },
                { label: "Suspended", value: users.trainees.suspended },
              ]}
            />
          </div>
        </div>
      </Section>

      <Section title="Organizations & platform">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Organizations" value={organizations.total} hint={`${organizations.active} active`} />
          <StatCard label="Pricing rules" value={platform.session_pricing_rules} />
          <StatCard label="Audit events (7d)" value={platform.audit_events_7d} hint={`${platform.audit_events_24h} in 24h`} />
          <StatCard label="Audit events (30d)" value={platform.audit_events_30d} />
        </div>
      </Section>

      {top_providers.length > 0 && (
        <Section title="Top providers by bookings">
          <div className="card-vibrant overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ethio-border text-left text-ethio-ink-muted">
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 text-right font-medium">Bookings</th>
                  <th className="px-4 py-3 text-right font-medium">Recorded revenue</th>
                </tr>
              </thead>
              <tbody>
                {top_providers.map((p) => (
                  <tr key={p.id} className="border-b border-ethio-border last:border-0">
                    <td className="px-4 py-3 font-medium text-ethio-ink">{p.name}</td>
                    <td className="px-4 py-3 text-right text-ethio-ink">{p.bookings}</td>
                    <td className="px-4 py-3 text-right text-ethio-ink">{formatMoney(p.revenue_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}
