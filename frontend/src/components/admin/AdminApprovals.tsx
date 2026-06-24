"use client";

import { useCallback, useEffect, useState } from "react";
import {
  approveTherapist,
  approveTrainee,
  listAdminSupervisors,
  listPendingTherapists,
  listPendingTrainees,
  rejectTherapist,
  rejectTrainee,
  type AdminSupervisor,
  type AuthUser,
  type PendingTherapist,
  type PendingTrainee,
} from "@/lib/api";
import { canReviewCounselors, canReviewTrainees } from "@/lib/roles";
import { formatDateTime } from "@/lib/format";

type ApprovalKind = "counselors" | "trainees";

type AdminApprovalsProps = {
  user: AuthUser;
  onPendingChange?: (count: number) => void;
};

export default function AdminApprovals({ user, onPendingChange }: AdminApprovalsProps) {
  const showCounselors = canReviewCounselors(user);
  const showTrainees = canReviewTrainees(user);
  const [subTab, setSubTab] = useState<ApprovalKind>(showCounselors ? "counselors" : "trainees");
  const [therapists, setTherapists] = useState<PendingTherapist[]>([]);
  const [trainees, setTrainees] = useState<PendingTrainee[]>([]);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; kind: ApprovalKind } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [supervisors, setSupervisors] = useState<AdminSupervisor[]>([]);
  const [traineeSupervisors, setTraineeSupervisors] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadQueues = useCallback(async () => {
    setError("");
    const tasks: Promise<void>[] = [];
    if (showCounselors) {
      tasks.push(listPendingTherapists().then((d) => setTherapists(d.therapists)));
    }
    if (showTrainees) {
      tasks.push(listPendingTrainees().then((d) => setTrainees(d.trainees)));
      tasks.push(listAdminSupervisors().then((d) => setSupervisors(d.supervisors)));
    }
    await Promise.all(tasks);
  }, [showCounselors, showTrainees]);

  useEffect(() => {
    loadQueues().catch((err) => setError(err instanceof Error ? err.message : "Failed to load approvals"));
  }, [loadQueues]);

  useEffect(() => {
    onPendingChange?.(therapists.length + trainees.length);
  }, [therapists.length, trainees.length, onPendingChange]);

  async function handleApprove(kind: ApprovalKind, id: string) {
    setActionId(id);
    setError("");
    try {
      if (kind === "counselors") {
        await approveTherapist(id);
        setTherapists((prev) => prev.filter((p) => p.id !== id));
      } else {
        const supervisorId = traineeSupervisors[id];
        if (!supervisorId && supervisors.length > 0) {
          setError("Select a supervisor before approving a trainee.");
          setActionId(null);
          return;
        }
        await approveTrainee(id, supervisorId);
        setTrainees((prev) => prev.filter((p) => p.id !== id));
      }
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
    setActionId(rejectTarget.id);
    setError("");
    try {
      if (rejectTarget.kind === "counselors") {
        await rejectTherapist(rejectTarget.id, reason);
        setTherapists((prev) => prev.filter((p) => p.id !== rejectTarget.id));
      } else {
        await rejectTrainee(rejectTarget.id, reason);
        setTrainees((prev) => prev.filter((p) => p.id !== rejectTarget.id));
      }
      setRejectTarget(null);
      setRejectReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setActionId(null);
    }
  }

  const list = subTab === "counselors" ? therapists : trainees;

  return (
    <div>
      {showCounselors && showTrainees && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubTab("counselors")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              subTab === "counselors" ? "bg-ethio-surface text-ethio-green-dark" : "text-ethio-ink-muted"
            }`}
          >
            Counselors {therapists.length > 0 && `(${therapists.length})`}
          </button>
          <button
            type="button"
            onClick={() => setSubTab("trainees")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              subTab === "trainees" ? "bg-ethio-surface text-ethio-green-dark" : "text-ethio-ink-muted"
            }`}
          >
            Trainees {trainees.length > 0 && `(${trainees.length})`}
          </button>
        </div>
      )}

      {error && <p className="mb-4 alert-error">{error}</p>}

      <section className="space-y-4">
        {list.length === 0 ? (
          <div className="card-vibrant p-8 text-center">
            <p className="text-lg font-semibold text-ethio-ink">No pending applications</p>
            <p className="mt-2 text-sm text-ethio-ink-muted">New provider registrations will appear here.</p>
          </div>
        ) : subTab === "counselors" ? (
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
                    ["Specializations", profile.specializations],
                    ["Bio", profile.bio],
                    ["License number", profile.license_number],
                    ["License authority", profile.license_authority],
                  ]}
                />
              )}
              {rejectTarget?.id === profile.id && rejectTarget.kind === "counselors" ? (
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
                  onApprove={() => handleApprove("counselors", profile.id)}
                  onReject={() => {
                    setRejectTarget({ id: profile.id, kind: "counselors" });
                    setRejectReason("");
                    setError("");
                  }}
                  loading={actionId === profile.id}
                />
              )}
            </article>
          ))
        ) : (
          trainees.map((profile) => (
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
                    ["Training program", profile.program_name],
                    ["Languages", profile.languages],
                  ]}
                />
              )}
              {supervisors.length > 0 && (
                <label className="mt-4 block text-sm font-medium text-ethio-ink">
                  Assign supervisor
                  <select
                    value={traineeSupervisors[profile.id] || ""}
                    onChange={(e) =>
                      setTraineeSupervisors((prev) => ({ ...prev, [profile.id]: e.target.value }))
                    }
                    className="input-field mt-1"
                  >
                    <option value="">Select supervisor…</option>
                    {supervisors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {rejectTarget?.id === profile.id && rejectTarget.kind === "trainees" ? (
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
                  onApprove={() => handleApprove("trainees", profile.id)}
                  onReject={() => {
                    setRejectTarget({ id: profile.id, kind: "trainees" });
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
