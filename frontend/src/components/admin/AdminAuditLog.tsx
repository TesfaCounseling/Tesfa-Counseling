"use client";

import { useEffect, useState } from "react";
import { listAuditLogs, type AuditLogEntry } from "@/lib/api";
import { formatDateTime, formatStatusLabel } from "@/lib/format";

function subjectLabel(entry: AuditLogEntry) {
  if (entry.resource_label) return entry.resource_label;
  if (entry.resource_id) return `${entry.resource_type} · ${entry.resource_id.slice(0, 8)}…`;
  return entry.resource_type;
}

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
        <p className="text-sm text-ethio-ink-muted">No activity yet. Platform actions will be recorded here.</p>
      )}

      {!loading && logs.length > 0 && (
        <>
          <p className="mb-3 text-sm text-ethio-ink-muted">Latest {logs.length} of {total} events</p>
          <div className="overflow-x-auto rounded-lg border border-ethio-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-ethio-border bg-ethio-surface text-left text-xs font-semibold uppercase tracking-wide text-ethio-ink-muted">
                  <th className="px-3 py-2 font-semibold">When</th>
                  <th className="px-3 py-2 font-semibold">Action</th>
                  <th className="px-3 py-2 font-semibold">Subject</th>
                  <th className="px-3 py-2 font-semibold">Details</th>
                  <th className="px-3 py-2 font-semibold">By</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry) => (
                  <tr key={entry.id} className="border-b border-ethio-border last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-ethio-ink-muted">
                      {formatDateTime(entry.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-ethio-ink">
                      {formatStatusLabel(entry.action)}
                    </td>
                    <td className="px-3 py-2 text-ethio-ink-muted">{subjectLabel(entry)}</td>
                    <td className="max-w-xs truncate px-3 py-2 text-ethio-ink-muted" title={entry.details || undefined}>
                      {entry.details || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-ethio-ink-muted">
                      {entry.actor_name || entry.actor_email || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
