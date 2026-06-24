"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import {
  createClinicalNote,
  getMe,
  getNoteByAppointment,
  submitClinicalNote,
  updateClinicalNote,
  type AuthUser,
  type ClinicalNote,
  type NoteSession,
} from "@/lib/api";
import { formatDateTime, formatStatusLabel } from "@/lib/format";

export default function ClinicalNoteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = String(params.appointmentId);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<NoteSession | null>(null);
  const [note, setNote] = useState<ClinicalNote | null>(null);
  const [form, setForm] = useState({ subjective: "", objective: "", assessment: "", plan: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isTrainee = user?.account_type === "trainee";
  const readOnly = note != null && note.status !== "draft";

  useEffect(() => {
    if (!localStorage.getItem("access_token")) {
      router.push("/login");
      return;
    }
    Promise.all([getMe(), getNoteByAppointment(appointmentId)])
      .then(([me, data]) => {
        if (me.user.account_type !== "therapist" && me.user.account_type !== "trainee") {
          router.replace("/dashboard");
          return;
        }
        setUser(me.user);
        setSession(data.session);
        setNote(data.note);
        if (data.note) {
          setForm({
            subjective: data.note.subjective || "",
            objective: data.note.objective || "",
            assessment: data.note.assessment || "",
            plan: data.note.plan || "",
          });
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load note"))
      .finally(() => setLoading(false));
  }, [appointmentId, router]);

  async function persistDraft(): Promise<ClinicalNote> {
    if (note) {
      const { note: updated } = await updateClinicalNote(note.id, form);
      setNote(updated);
      return updated;
    }
    const { note: created } = await createClinicalNote({ appointment_id: appointmentId, ...form });
    setNote(created);
    return created;
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const hadNote = Boolean(note);
      await persistDraft();
      setMessage(hadNote ? "Draft saved." : "Note created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const saved = await persistDraft();
      const { note: submitted } = await submitClinicalNote(saved.id);
      setNote(submitted);
      setForm({
        subjective: submitted.subjective || "",
        objective: submitted.objective || "",
        assessment: submitted.assessment || "",
        plan: submitted.plan || "",
      });
      setMessage(isTrainee ? "Submitted to your supervisor for cosign." : "Note finalized.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <SiteHeader showAuth={false} />
        <main className="mx-auto max-w-3xl page-pad py-12">
          <p className="text-ethio-ink-muted">Loading…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-3xl page-pad pb-12 pt-8">
        <Link href="/provider/notes" className="text-sm font-semibold text-ethio-green-dark">
          ← Session notes
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-extrabold text-ethio-ink">SOAP note</h1>
          {session && (
            <p className="mt-2 text-sm text-ethio-ink-muted">
              {session.client_name} · {formatDateTime(session.starts_at)}
              {note && ` · ${formatStatusLabel(note.status)}`}
            </p>
          )}
        </div>

        {message && <p className="mt-4 alert-success">{message}</p>}
        {error && <p className="mt-4 alert-error">{error}</p>}

        {note?.status === "submitted" && (
          <div className="mt-4 card-vibrant p-4 text-sm text-ethio-ink-muted">
            Waiting for supervisor cosign. You cannot edit this note until your supervisor reviews it.
          </div>
        )}

        {note?.status === "cosigned" && (
          <div className="mt-4 card-vibrant p-4 text-sm">
            <p className="font-semibold text-ethio-green-dark">Finalized</p>
            {note.cosigned_by_name && (
              <p className="mt-1 text-ethio-ink-muted">
                {isTrainee ? `Cosigned by ${note.cosigned_by_name}` : "Signed and locked"}
                {note.cosigned_at && ` · ${formatDateTime(note.cosigned_at)}`}
              </p>
            )}
            {note.supervisor_comment && (
              <p className="mt-2 text-ethio-ink">Supervisor comment: {note.supervisor_comment}</p>
            )}
          </div>
        )}

        <form onSubmit={handleSave} className="mt-6 space-y-4">
          {(["subjective", "objective", "assessment", "plan"] as const).map((field) => (
            <label key={field} className="block text-sm font-medium text-ethio-ink">
              {field.charAt(0).toUpperCase() + field.slice(1)}
              <textarea
                value={form[field]}
                onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
                rows={4}
                readOnly={readOnly}
                className="input-field mt-1 resize-y"
                placeholder={
                  field === "subjective"
                    ? "Client reported concerns, mood, context…"
                    : field === "objective"
                      ? "Observations, affect, engagement…"
                      : field === "assessment"
                        ? "Clinical impression, progress…"
                        : "Plan for next session, homework, referrals…"
                }
              />
            </label>
          ))}

          {!readOnly && (
            <div className="flex flex-wrap gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-secondary text-sm">
                {saving ? "Saving…" : note ? "Save draft" : "Create draft"}
              </button>
              {note ? (
                <button type="button" disabled={saving} onClick={handleSubmit} className="btn-primary text-sm">
                  {isTrainee ? "Submit for cosign" : "Finalize note"}
                </button>
              ) : (
                <button type="button" disabled={saving} onClick={handleSubmit} className="btn-primary text-sm">
                  {isTrainee ? "Save & submit for cosign" : "Save & finalize"}
                </button>
              )}
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
