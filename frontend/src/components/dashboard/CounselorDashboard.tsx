"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Appointment, AuthUser, ProviderProfile } from "@/lib/api";
import { getMyProviderProfile } from "@/lib/api";
import { appointmentTimezoneLabel, formatAppointmentWhen, formatMoney } from "@/lib/format";

type CounselorDashboardProps = {
  user: AuthUser | null;
  appointments: Appointment[];
  loadingSessions: boolean;
  error: string;
  onCancel: (id: string) => void;
};

export default function CounselorDashboard({
  user,
  appointments,
  loadingSessions,
  error,
  onCancel,
}: CounselorDashboardProps) {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);

  useEffect(() => {
    if (user?.account_type !== "trainee") return;
    getMyProviderProfile()
      .then((data) => setProfile(data.profile))
      .catch(() => {});
  }, [user?.account_type]);

  return (
    <>
      {user?.account_type === "trainee" && profile?.supervisor_name && (
        <div className="card-vibrant mb-6 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ethio-ink-muted">Your supervisor</p>
          <p className="mt-1 text-base font-semibold text-ethio-ink">{profile.supervisor_name}</p>
          {profile.supervisor_email && (
            <p className="text-sm text-ethio-ink-muted">{profile.supervisor_email}</p>
          )}
        </div>
      )}

      {user?.account_type === "trainee" && profile && !profile.supervisor_name && (
        <div className="card-vibrant mb-6 p-4">
          <p className="text-sm text-ethio-ink-muted">
            A supervisor will be assigned when your application is approved.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/provider/profile" className="card-vibrant flex min-h-[80px] items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ethio-gradient text-lg text-white shadow-ethio">
            ✏️
          </span>
          <span className="text-base font-semibold text-ethio-green-dark">Edit profile</span>
        </Link>
        <Link href="/provider/schedule" className="card-vibrant flex min-h-[80px] items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ethio-gold-warm text-lg">
            📅
          </span>
          <span className="text-base font-semibold text-ethio-ink">Manage schedule</span>
        </Link>
        <Link href="/provider/notes" className="card-vibrant flex min-h-[80px] items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ethio-surface text-lg">
            📋
          </span>
          <span className="text-base font-semibold text-ethio-ink">Session notes</span>
        </Link>
        {user?.account_type === "trainee" && (
          <Link href="/provider/intakes" className="card-vibrant flex min-h-[80px] items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ethio-surface text-lg">
              📝
            </span>
            <span className="text-base font-semibold text-ethio-ink">Client intakes</span>
          </Link>
        )}
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-ethio-ink">Upcoming sessions</h2>
        {loadingSessions && <p className="mt-3 text-sm text-ethio-ink-muted">Loading sessions…</p>}
        {error && (
          <div className="mt-3 space-y-2">
            <p className="alert-error">{error}</p>
            {error.toLowerCase().includes("session expired") && (
              <Link href="/login?next=/dashboard" className="link-inline text-sm">
                Log in again
              </Link>
            )}
          </div>
        )}
        <div className="mt-4 space-y-3">
          {appointments.map((appt) => (
            <div key={appt.id} className="card-vibrant p-4">
              <p className="font-semibold text-ethio-ink">{formatAppointmentWhen(appt, true)}</p>
              <p className="text-xs text-ethio-ink-muted">{appointmentTimezoneLabel(appt, true)}</p>
              <p className="text-sm text-ethio-ink-muted">
                {appt.provider_name || "Provider"}
                {appt.client_name ? ` · ${appt.client_name}` : ""} · {appt.duration_minutes} min · {appt.status}
                {appt.session_mode === "audio_only" && " · Audio"}
              </p>
              {appt.amount_cents === 0 ? (
                <p className="text-xs font-medium text-ethio-green">Pro bono</p>
              ) : (
                <p className="text-xs text-ethio-ink-muted">{formatMoney(appt.amount_cents, appt.currency)}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-3">
                {appt.can_join_video && appt.video_room_url && (
                  <a
                    href={appt.video_room_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary text-sm"
                  >
                    {appt.session_mode === "audio_only" ? "Join audio session" : "Join video session"}
                  </a>
                )}
                {appt.video_room_url && !appt.can_join_video && (
                  <span className="text-xs text-ethio-ink-muted">
                    {appt.session_mode === "audio_only" ? "Audio" : "Video"} opens 15 minutes before session
                  </span>
                )}
                {!appt.video_room_url && (
                  <span className="text-xs text-ethio-ink-muted">
                    Join link appears 15 minutes before start when{" "}
                    {appt.session_mode === "audio_only" ? "audio" : "video"} is enabled.
                  </span>
                )}
                <Link
                  href={`/counselors/${appt.provider_id}/book?reschedule=${appt.id}`}
                  className="text-sm font-semibold text-ethio-green-dark"
                >
                  Reschedule
                </Link>
                <button type="button" onClick={() => onCancel(appt.id)} className="text-sm font-semibold text-ethio-red">
                  Cancel
                </button>
              </div>
            </div>
          ))}
          {!loadingSessions && !error && appointments.length === 0 && (
            <div className="card-vibrant p-5 text-center">
              <p className="font-medium text-ethio-ink">No upcoming sessions</p>
              <p className="mt-1 text-sm text-ethio-ink-muted">Your schedule is clear for now.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
