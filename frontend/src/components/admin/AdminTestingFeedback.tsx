"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listAdminTestingFeedback,
  updateAdminTestingFeedback,
  type AdminTestingFeedback,
  type FeedbackStatusFilter,
  type TestingFeedbackType,
} from "@/lib/api";
import { formatDateTime, formatStatusLabel } from "@/lib/format";

const TYPE_LABELS: Record<TestingFeedbackType, string> = {
  change: "Change",
  bug: "Bug",
  add_feature: "Add feature",
  confusing: "Confusing",
  other: "Other",
};

type Props = {
  onUpdated?: () => void;
};

export default function AdminTestingFeedback({ onUpdated }: Props) {
  const [items, setItems] = useState<AdminTestingFeedback[]>([]);
  const [total, setTotal] = useState(0);
  const [openCount, setOpenCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatusFilter>("open");
  const [pageFilter, setPageFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listAdminTestingFeedback({
        status: statusFilter,
        page_path: pageFilter.trim() || undefined,
        limit: 50,
      });
      setItems(data.feedback);
      setTotal(data.total);
      setOpenCount(data.open_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load testing feedback");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, pageFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleResolve(id: string) {
    setUpdatingId(id);
    try {
      await updateAdminTestingFeedback(id, { status: "resolved" });
      await load();
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleReopen(id: string) {
    setUpdatingId(id);
    try {
      await updateAdminTestingFeedback(id, { status: "open" });
      await load();
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm text-ethio-ink-muted">
        Notes from testers during the testing phase. Each item includes the page they were on.
      </p>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ethio-ink-muted">
          {openCount} open note{openCount === 1 ? "" : "s"}
        </p>
        <div className="flex flex-wrap gap-2">
          {(["open", "resolved", "all"] as FeedbackStatusFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                statusFilter === value
                  ? "bg-ethio-green text-white"
                  : "border border-ethio-border bg-white text-ethio-ink-muted"
              }`}
            >
              {formatStatusLabel(value)}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="testing-page-filter" className="text-sm font-semibold text-ethio-ink">
          Filter by page
        </label>
        <input
          id="testing-page-filter"
          type="text"
          value={pageFilter}
          onChange={(e) => setPageFilter(e.target.value)}
          placeholder="/dashboard"
          className="mt-1 w-full max-w-sm rounded-xl border border-ethio-border px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="mb-4 alert-error">{error}</p>}
      {loading && <p className="text-sm text-ethio-ink-muted">Loading testing feedback…</p>}

      {!loading && items.length === 0 && (
        <p className="text-sm text-ethio-ink-muted">No {statusFilter === "all" ? "" : statusFilter} notes yet.</p>
      )}

      {!loading && items.length > 0 && (
        <>
          <p className="mb-3 text-sm text-ethio-ink-muted">
            Showing {items.length} of {total}
          </p>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="card-vibrant p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-ethio-green-dark">
                      {item.page_context || item.page_title || item.page_path}
                    </p>
                    {item.page_context && (
                      <p className="mt-0.5 break-all font-mono text-xs text-ethio-ink-muted">{item.page_path}</p>
                    )}
                    {!item.page_context && item.page_path && (
                      <p className="mt-0.5 break-all font-mono text-xs text-ethio-ink-muted">{item.page_path}</p>
                    )}
                    <p className="mt-1 text-xs text-ethio-ink-muted">
                      {TYPE_LABELS[item.feedback_type]} · {formatDateTime(item.created_at)} ·{" "}
                      {item.user_name || "Tester"}
                      {item.user_email ? ` · ${item.user_email}` : ""}
                      {item.tester_role ? ` · ${formatStatusLabel(item.tester_role)}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      item.status === "open"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-ethio-surface text-ethio-ink-muted"
                    }`}
                  >
                    {formatStatusLabel(item.status)}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-ethio-ink">{item.message}</p>
                {item.status === "resolved" && item.resolved_by_name && (
                  <p className="mt-2 text-xs text-ethio-ink-muted">
                    Done by {item.resolved_by_name}
                    {item.resolved_at ? ` · ${formatDateTime(item.resolved_at)}` : ""}
                  </p>
                )}
                <div className="mt-3">
                  {item.status === "open" ? (
                    <button
                      type="button"
                      onClick={() => handleResolve(item.id)}
                      disabled={updatingId === item.id}
                      className="text-sm font-semibold text-ethio-green-dark disabled:opacity-60"
                    >
                      {updatingId === item.id ? "Updating…" : "Mark done"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleReopen(item.id)}
                      disabled={updatingId === item.id}
                      className="text-sm font-semibold text-ethio-ink-muted disabled:opacity-60"
                    >
                      {updatingId === item.id ? "Updating…" : "Reopen"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
