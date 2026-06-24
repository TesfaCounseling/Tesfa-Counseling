"use client";

import { useEffect, useState } from "react";
import { listAuditLogs, type AuditLogEntry } from "@/lib/api";
import { formatDateTime, formatStatusLabel } from "@/lib/format";

export default function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAuditLogs({ limit: 50 })
      .then((data) => {
        setLogs(data.logs);
        setTotal(data.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load audit log"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {error && <p className="mb-4 alert-error">{error}</p>}
      {loading && <p className="text-sm text-ethio-ink-muted">Loading activity…</p>}

      {!loading && logs.length === 0 && (
        <div className="card-vibrant p-8 text-center">
          <p className="font-semibold text-ethio-ink">No activity yet</p>
          <p className="mt-2 text-sm text-ethio-ink-muted">Platform actions will be recorded here.</p>
        </div>
      )}

      {!loading && logs.length > 0 && (
        <p className="mb-3 text-sm text-ethio-ink-muted">Latest {logs.length} of {total} events</p>
      )}

      <div className="space-y-2">
        {logs.map((entry) => (
          <article key={entry.id} className="card-vibrant p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-semibold text-ethio-ink">{formatStatusLabel(entry.action)}</p>
              <time className="text-xs text-ethio-ink-muted">{formatDateTime(entry.created_at)}</time>
            </div>
            <p className="mt-1 text-sm text-ethio-ink-muted">
              {entry.resource_label ||
                entry.actor_name ||
                (entry.resource_id ? `${entry.resource_type} · ${entry.resource_id.slice(0, 8)}…` : entry.resource_type)}
            </p>
            {entry.details && <p className="mt-2 text-sm text-ethio-ink">{entry.details}</p>}
            {(entry.actor_name || entry.actor_email) && (
              <p className="mt-2 text-xs text-ethio-ink-muted">
                By {entry.actor_name || entry.actor_email}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
