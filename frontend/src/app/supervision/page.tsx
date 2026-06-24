"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import PageHero from "@/components/PageHero";
import { cosignClinicalNote, listSupervisionQueue, type ClinicalNote } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

export default function SupervisionPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});

  function load() {
    setLoading(true);
    listSupervisionQueue()
      .then((data) => setNotes(data.notes))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load queue"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!localStorage.getItem("access_token")) {
      router.push("/login?next=/supervision");
      return;
    }
    load();
  }, [router]);

  async function handleCosign(noteId: string) {
    setActionId(noteId);
    setError("");
    try {
      await cosignClinicalNote(noteId, comments[noteId]);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cosign failed");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="page-shell">
      <SiteHeader showAuth={false} />
      <PageHero
        eyebrow="Supervision"
        title="Notes awaiting cosign"
        subtitle="Review trainee session documentation and cosign to finalize records."
        backHref="/dashboard"
        backLabel="Dashboard"
      />
      <main className="mx-auto max-w-3xl page-pad pb-12 pt-2">
        {error && <p className="mb-4 alert-error">{error}</p>}
        {loading && <p className="text-sm text-ethio-ink-muted">Loading queue…</p>}

        {!loading && notes.length === 0 && (
          <div className="card-vibrant p-8 text-center">
            <p className="font-semibold text-ethio-ink">All caught up</p>
            <p className="mt-2 text-sm text-ethio-ink-muted">No trainee notes waiting for your cosign.</p>
          </div>
        )}

        <div className="space-y-4">
          {notes.map((note) => (
            <article key={note.id} className="card-vibrant p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ethio-ink">{note.client_name}</p>
                  <p className="text-sm text-ethio-ink-muted">
                    By {note.author_name} · {note.session_at && formatDateTime(note.session_at)}
                  </p>
                </div>
                <Link href={`/provider/notes/${note.appointment_id}`} className="text-sm font-semibold text-ethio-green-dark">
                  Read full note →
                </Link>
              </div>

              <div className="mt-4 space-y-2 rounded-xl bg-ethio-surface p-4 text-sm">
                {note.subjective && (
                  <p>
                    <span className="font-semibold text-ethio-ink">S:</span> {note.subjective}
                  </p>
                )}
                {note.assessment && (
                  <p>
                    <span className="font-semibold text-ethio-ink">A:</span> {note.assessment}
                  </p>
                )}
                {note.plan && (
                  <p>
                    <span className="font-semibold text-ethio-ink">P:</span> {note.plan}
                  </p>
                )}
              </div>

              <label className="mt-4 block text-sm font-medium text-ethio-ink">
                Supervisor comment (optional)
                <textarea
                  value={comments[note.id] || ""}
                  onChange={(e) => setComments((prev) => ({ ...prev, [note.id]: e.target.value }))}
                  rows={2}
                  className="input-field mt-1 resize-y"
                  placeholder="Feedback for the trainee…"
                />
              </label>

              <button
                type="button"
                onClick={() => handleCosign(note.id)}
                disabled={actionId === note.id}
                className="btn-primary mt-4 text-sm"
              >
                {actionId === note.id ? "Cosigning…" : "Cosign & finalize"}
              </button>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
