"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { getAdminStatistics, checkAdminDailyVideo, testAdminDailyRoom, backfillAdminVideoRooms, sendAdminTestEmail, type AdminStatistics } from "@/lib/api";
import { formatPricingType, formatStatusLabel } from "@/lib/format";

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
  const [dailyStatus, setDailyStatus] = useState("");
  const [dailyBusy, setDailyBusy] = useState(false);

  const runDailyCheck = async () => {
    setDailyBusy(true);
    setDailyStatus("");
    try {
      const result = await checkAdminDailyVideo();
      setDailyStatus(result.ok ? `✓ ${result.message}` : `✗ ${result.message}${result.detail ? ` — ${result.detail}` : ""}`);
    } catch (err) {
      setDailyStatus(err instanceof Error ? err.message : "Daily check failed");
    } finally {
      setDailyBusy(false);
    }
  };

  const runDailyTest = async () => {
    setDailyBusy(true);
    setDailyStatus("");
    try {
      const result = await testAdminDailyRoom();
      setDailyStatus(
        result.ok
          ? `✓ ${result.message}${result.room_url ? ` — ${result.room_url}` : ""}`
          : `✗ ${result.message}${result.detail ? ` — ${result.detail}` : ""}`
      );
    } catch (err) {
      setDailyStatus(err instanceof Error ? err.message : "Daily test failed");
    } finally {
      setDailyBusy(false);
    }
  };

  const runBackfill = async () => {
    setDailyBusy(true);
    setDailyStatus("");
    try {
      const result = await backfillAdminVideoRooms();
      setDailyStatus(`✓ ${result.message} (${result.created}/${result.attempted})`);
      await load();
    } catch (err) {
      setDailyStatus(err instanceof Error ? err.message : "Backfill failed");
    } finally {
      setDailyBusy(false);
    }
  };

  const runTestEmail = async () => {
    setDailyBusy(true);
    setDailyStatus("");
    try {
      const result = await sendAdminTestEmail();
      setDailyStatus(result.ok ? `✓ ${result.message}` : `✗ ${result.message}`);
    } catch (err) {
      setDailyStatus(err instanceof Error ? err.message : "Test email failed");
    } finally {
      setDailyBusy(false);
    }
  };

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

  const { users, appointments, revenue, trends, top_providers } = stats;
  const cancellationRate =
    appointments.total > 0 ? Math.round((appointments.cancelled / appointments.total) * 100) : 0;
  const completionRate =
    appointments.total > 0 ? Math.round((appointments.completed / appointments.total) * 100) : 0;

  return (
    <div className="space-y-8">
      <Section title="Video (Daily.co)">
        <p className="mb-3 text-sm text-ethio-ink-muted">
          Test whether Render has a valid Daily API key and create rooms for booked sessions.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={runDailyCheck} disabled={dailyBusy} className="btn-secondary text-sm">
            Check API key
          </button>
          <button type="button" onClick={runDailyTest} disabled={dailyBusy} className="btn-secondary text-sm">
            Create test room
          </button>
          <button type="button" onClick={runBackfill} disabled={dailyBusy} className="btn-primary text-sm">
            Backfill session rooms
          </button>
          <button type="button" onClick={runTestEmail} disabled={dailyBusy} className="btn-secondary text-sm">
            Send test email
          </button>
        </div>
        {dailyStatus && <p className="mt-3 text-sm text-ethio-ink">{dailyStatus}</p>}
        <p className="mt-2 text-xs text-ethio-ink-muted">
          Appointments with video: {appointments.with_video_room} · Upcoming: {appointments.upcoming}
        </p>
      </Section>

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
          label="Active counselors"
          value={users.counselors.approved}
          hint={`${users.counselors.pending} pending approval`}
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
              label: formatPricingType(k),
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
        <div className="max-w-md">
          <BreakdownTable
            rows={[
              { label: "Approved", value: users.counselors.approved },
              { label: "Pending", value: users.counselors.pending },
              { label: "Rejected", value: users.counselors.rejected },
              { label: "Suspended", value: users.counselors.suspended },
            ]}
          />
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
