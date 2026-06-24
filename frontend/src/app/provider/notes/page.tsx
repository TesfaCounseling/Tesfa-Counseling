"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import PageHero from "@/components/PageHero";
import { completeAppointment, getMe, listNoteSessions, type NoteSession } from "@/lib/api";
import { formatDateTime, formatStatusLabel } from "@/lib/format";

function isProvider(accountType?: string | null) {
  return accountType === "therapist" || accountType === "trainee";
}

function noteStatusBadge(status: string | null) {
  if (!status) return { label: "Needs note", className: "bg-ethio-gold-warm/30 text-ethio-ink" };
  if (status === "draft") return { label: "Draft", className: "bg-ethio-surface text-ethio-ink-muted" };
  if (status === "submitted") return { label: "Awaiting cosign", className: "bg-amber-100 text-amber-900" };
  if (status === "cosigned") return { label: "Finalized", className: "bg-ethio-green/10 text-ethio-green-dark" };
  return { label: formatStatusLabel(status), className: "bg-ethio-surface text-ethio-ink-muted" };
}

export default function ProviderNotesPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<NoteSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    listNoteSessions()
      .then((data) => setSessions(data.sessions))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load sessions"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login?next=/provider/notes");
      return;
    }
    getMe()
      .then((data) => {
        if (!isProvider(data.user.account_type)) {
          router.replace("/dashboard");
          return;
        }
        load();
      })
      .catch(() => router.push("/login?next=/provider/notes"));
  }, [router]);

  async function markComplete(appointmentId: string) {
    try {
      await completeAppointment(appointmentId);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark complete");
    }
  }

  return (
    <div className="page-shell">
      <SiteHeader showAuth={false} />
      <PageHero
        eyebrow="Clinical documentation"
        title="Session notes"
        subtitle="Write SOAP notes after sessions. Trainee notes require supervisor cosign before they are finalized."
        backHref="/dashboard"
        backLabel="Dashboard"
      />
      <main className="mx-auto max-w-3xl page-pad pb-12 pt-2">
        {error && <p className="mb-4 alert-error">{error}</p>}
        {loading && <p className="text-sm text-ethio-ink-muted">Loading sessions…</p>}

        {!loading && sessions.length === 0 && !error && (
          <div className="card-vibrant p-8 text-center">
            <p className="font-semibold text-ethio-ink">No sessions ready for notes</p>
            <p className="mt-2 text-sm text-ethio-ink-muted">
              Notes become available after a session ends. Completed sessions appear here.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {sessions.map((session) => {
            const badge = noteStatusBadge(session.note_status);
            return (
              <article key={session.appointment_id} className="card-vibrant p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ethio-ink">{session.client_name || "Client"}</p>
                    <p className="text-sm text-ethio-ink-muted">
                      {formatDateTime(session.starts_at)} · {session.duration_minutes} min
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href={`/provider/notes/${session.appointment_id}`} className="btn-primary text-sm">
                    {session.note_id ? "Open note" : "Write note"}
                  </Link>
                  {session.status === "confirmed" && (
                    <button
                      type="button"
                      onClick={() => markComplete(session.appointment_id)}
                      className="btn-secondary text-sm"
                    >
                      Mark session complete
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
