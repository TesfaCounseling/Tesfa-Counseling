"use client";

import Link from "next/link";
import type { ClinicalNote, SupervisionTrainee } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type SupervisionDashboardProps = {
  trainees: SupervisionTrainee[];
  pendingNotes: ClinicalNote[];
  pendingCount: number;
  loading: boolean;
  error: string;
};

export default function SupervisionDashboard({
  trainees,
  pendingNotes,
  pendingCount,
  loading,
  error,
}: SupervisionDashboardProps) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/supervision" className="card-vibrant flex min-h-[80px] items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ethio-green-dark text-lg text-white">
            ✓
          </span>
          <span className="flex-1">
            <span className="block text-base font-semibold text-ethio-green-dark">Review cosign queue</span>
            <span className="text-sm text-ethio-ink-muted">
              {pendingCount > 0
                ? `${pendingCount} trainee note${pendingCount === 1 ? "" : "s"} awaiting your cosign`
                : "No notes waiting right now"}
            </span>
          </span>
          {pendingCount > 0 && (
            <span className="rounded-full bg-ethio-red px-2.5 py-1 text-xs font-bold text-white">{pendingCount}</span>
          )}
        </Link>
        <Link href="/supervision/intakes" className="card-vibrant flex min-h-[80px] items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ethio-surface text-lg">
            📝
          </span>
          <span className="flex-1">
            <span className="block text-base font-semibold text-ethio-ink">Client intake forms</span>
            <span className="text-sm text-ethio-ink-muted">Review intake completed before trainee sessions</span>
          </span>
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-ethio-ink">My trainees</h2>
        {loading && <p className="mt-3 text-sm text-ethio-ink-muted">Loading supervision overview…</p>}
        {error && <p className="mt-3 alert-error">{error}</p>}

        {!loading && !error && trainees.length === 0 && (
          <div className="card-vibrant mt-4 p-5 text-center">
            <p className="font-medium text-ethio-ink">No trainees assigned yet</p>
            <p className="mt-1 text-sm text-ethio-ink-muted">
              Trainees are linked to you when an admin approves them and selects you as supervisor.
            </p>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {trainees.map((trainee) => (
            <div key={trainee.id} className="card-vibrant p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ethio-ink">{trainee.full_name}</p>
                  <p className="text-sm text-ethio-ink-muted">
                    {trainee.program_name || "Trainee"}
                    {trainee.languages ? ` · ${trainee.languages}` : ""}
                  </p>
                </div>
                {trainee.pending_notes > 0 ? (
                  <span className="rounded-full bg-ethio-gold-warm px-2.5 py-1 text-xs font-bold text-ethio-ink">
                    {trainee.pending_notes} note{trainee.pending_notes === 1 ? "" : "s"} pending
                  </span>
                ) : (
                  <span className="text-xs font-medium text-ethio-green">Notes up to date</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {pendingNotes.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-ethio-ink">Needs your review</h2>
            <Link href="/supervision" className="text-sm font-semibold text-ethio-green-dark">
              View all →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {pendingNotes.map((note) => (
              <div key={note.id} className="card-vibrant p-4">
                <p className="font-semibold text-ethio-ink">{note.client_name}</p>
                <p className="text-sm text-ethio-ink-muted">
                  By {note.author_name}
                  {note.session_at ? ` · ${formatDateTime(note.session_at)}` : ""}
                </p>
                <Link
                  href={`/provider/notes/${note.appointment_id}`}
                  className="mt-3 inline-block text-sm font-semibold text-ethio-green-dark"
                >
                  Review note →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
