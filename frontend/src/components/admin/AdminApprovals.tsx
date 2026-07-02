"use client";

import { useCallback, useEffect, useState } from "react";
import {
  approveTherapist,
  listPendingTherapists,
  rejectTherapist,
  type AuthUser,
  type PendingTherapist,
} from "@/lib/api";
import { canReviewCounselors } from "@/lib/roles";
import { formatDateTime } from "@/lib/format";

type AdminApprovalsProps = {
  user: AuthUser;
  onPendingChange?: (count: number) => void;
};

export default function AdminApprovals({ user, onPendingChange }: AdminApprovalsProps) {
  const showCounselors = canReviewCounselors(user);
  const [therapists, setTherapists] = useState<PendingTherapist[]>([]);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadQueues = useCallback(async () => {
    setError("");
    if (showCounselors) {
      const data = await listPendingTherapists();
      setTherapists(data.therapists);
    }
  }, [showCounselors]);

  useEffect(() => {
    loadQueues().catch((err) => setError(err instanceof Error ? err.message : "Failed to load approvals"));
  }, [loadQueues]);

  useEffect(() => {
    onPendingChange?.(therapists.length);
  }, [therapists.length, onPendingChange]);

  async function handleApprove(id: string) {
    setActionId(id);
    setError("");
    try {
      await approveTherapist(id);
      setTherapists((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setActionId(null);
    }
  }

  async function handleRejectConfirm() {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setError("Please enter a rejection reason.");
      return;
    }
    setActionId(rejectTarget);
    setError("");
    try {
      await rejectTherapist(rejectTarget, reason);
      setTherapists((prev) => prev.filter((p) => p.id !== rejectTarget));
      setRejectTarget(null);
      setRejectReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setActionId(null);
    }
  }

  if (!showCounselors) {
    return (
      <p className="text-sm text-ethio-ink-muted">You do not have permission to review counselor applications.</p>
    );
  }

  return (
    <div>
      {error && <p className="mb-4 alert-error">{error}</p>}

      <section className="space-y-4">
        {therapists.length === 0 ? (
          <div className="card-vibrant p-8 text-center">
            <p className="text-lg font-semibold text-ethio-ink">No pending applications</p>
            <p className="mt-2 text-sm text-ethio-ink-muted">New counselor registrations will appear here.</p>
          </div>
        ) : (
          therapists.map((profile) => (
            <article key={profile.id} className="card-vibrant p-5">
              <Header name={profile.full_name} email={profile.email} createdAt={profile.created_at} />
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === profile.id ? null : profile.id)}
                className="mt-3 text-sm font-semibold text-ethio-green-dark"
              >
                {expandedId === profile.id ? "Hide application" : "View application"}
              </button>
              {expandedId === profile.id && (
                <ApplicationDetails
                  rows={[
                    ["Organization", profile.organization_name],
                    ["Languages", profile.languages],
                    ["Specialties", profile.specializations],
                    ["Bio", profile.bio],
                    ["License number", profile.license_number],
                    ["License authority", profile.license_authority],
                  ]}
                />
              )}
              {rejectTarget === profile.id ? (
                <RejectForm
                  id={profile.id}
                  reason={rejectReason}
                  onReasonChange={setRejectReason}
                  onConfirm={handleRejectConfirm}
                  onCancel={() => {
                    setRejectTarget(null);
                    setRejectReason("");
                  }}
                  loading={actionId === profile.id}
                />
              ) : (
                <ActionButtons
                  onApprove={() => handleApprove(profile.id)}
                  onReject={() => {
                    setRejectTarget(profile.id);
                    setRejectReason("");
                    setError("");
                  }}
                  loading={actionId === profile.id}
                />
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function ApplicationDetails({ rows }: { rows: [string, string | null | undefined][] }) {
  return (
    <dl className="mt-4 space-y-2 rounded-xl bg-ethio-surface p-4 text-sm">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="font-semibold text-ethio-ink">{label}</dt>
          <dd className="mt-0.5 text-ethio-ink-muted">{value?.trim() ? value : "Not provided yet"}</dd>
        </div>
      ))}
    </dl>
  );
}

function Header({ name, email, createdAt }: { name: string; email: string; createdAt: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-ethio-ink">{name}</h2>
        <p className="text-sm text-ethio-ink-muted">{email}</p>
        <p className="mt-1 text-xs text-ethio-ink-muted">Applied {formatDateTime(createdAt)}</p>
      </div>
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Pending</span>
    </div>
  );
}

function ActionButtons({
  onApprove,
  onReject,
  loading,
}: {
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <button type="button" onClick={onApprove} disabled={loading} className="btn-primary text-sm disabled:opacity-60">
        {loading ? "Working…" : "Approve"}
      </button>
      <button
        type="button"
        onClick={onReject}
        disabled={loading}
        className="rounded-lg border border-ethio-red/30 px-4 py-2 text-sm font-semibold text-ethio-red disabled:opacity-60"
      >
        Reject
      </button>
    </div>
  );
}

function RejectForm({
  id,
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
  loading,
}: {
  id: string;
  reason: string;
  onReasonChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="mt-5 rounded-xl border border-ethio-border bg-white p-4">
      <label htmlFor={`reject-${id}`} className="text-sm font-semibold text-ethio-ink">
        Rejection reason (required)
      </label>
      <textarea
        id={`reject-${id}`}
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        rows={3}
        className="mt-2 w-full rounded-lg border border-ethio-border px-3 py-2 text-sm"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onConfirm} disabled={loading} className="btn-primary text-sm disabled:opacity-60">
          {loading ? "Rejecting…" : "Confirm reject"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-ethio-border px-4 py-2 text-sm font-semibold text-ethio-ink-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
