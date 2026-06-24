"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import PageHero from "@/components/PageHero";
import AdminDashboardPanel from "@/components/admin/AdminDashboardPanel";
import AccountTabs, { type AccountTab } from "@/components/dashboard/AccountTabs";
import CounselorDashboard from "@/components/dashboard/CounselorDashboard";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import SupervisionDashboard from "@/components/dashboard/SupervisionDashboard";
import {
  cancelAppointment,
  getMe,
  getSupervisionOverview,
  listAppointments,
  type Appointment,
  type AuthUser,
  type ClinicalNote,
  type SupervisionTrainee,
} from "@/lib/api";
import { appointmentTimezoneLabel, formatAppointmentWhen, formatMoney } from "@/lib/format";
import {
  canManagePlatform,
  hasAdminAccess,
  hasCounselorAndSupervisorRoles,
  isCounselorProvider,
  isSupervisor,
} from "@/lib/roles";

type ProviderTab = "counseling" | "supervision";

export default function DashboardPage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [error, setError] = useState("");
  const [accountTab, setAccountTab] = useState<AccountTab>("platform");
  const [providerTab, setProviderTab] = useState<ProviderTab>("counseling");
  const [trainees, setTrainees] = useState<SupervisionTrainee[]>([]);
  const [pendingNotes, setPendingNotes] = useState<ClinicalNote[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loadingSupervision, setLoadingSupervision] = useState(false);
  const [supervisionError, setSupervisionError] = useState("");

  const provider = userLoaded && isCounselorProvider(user);
  const supervisor = userLoaded && isSupervisor(user);
  const dualRole = userLoaded && hasCounselorAndSupervisorRoles(user);
  const platformAdmin = userLoaded && canManagePlatform(user);
  const staffAdmin = userLoaded && hasAdminAccess(user) && !platformAdmin;
  const showPlatform = platformAdmin;
  const showApprovals = staffAdmin;
  const showCounseling = provider;
  const showSupervision = supervisor;
  const multiArea =
    [showPlatform, showApprovals, showCounseling, showSupervision].filter(Boolean).length > 1;

  useEffect(() => {
    const t = localStorage.getItem("access_token");
    setToken(t);
    if (!t) {
      setLoadingSessions(false);
      return;
    }
    getMe()
      .then((data) => setUser(data.user))
      .catch(() => {})
      .finally(() => setUserLoaded(true));
    listAppointments(true)
      .then((data) => setAppointments(data.appointments))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load sessions"))
      .finally(() => setLoadingSessions(false));
  }, []);

  useEffect(() => {
    if (!userLoaded) return;
    if (platformAdmin) {
      setAccountTab("platform");
      return;
    }
    if (staffAdmin && supervisor) {
      setAccountTab("supervision");
      return;
    }
    if (staffAdmin) {
      setAccountTab("approvals");
      return;
    }
    if (provider) setAccountTab("counseling");
    else if (supervisor) setAccountTab("supervision");
  }, [userLoaded, platformAdmin, staffAdmin, provider, supervisor]);

  useEffect(() => {
    if (!token || !supervisor) return;
    setLoadingSupervision(true);
    getSupervisionOverview()
      .then((data) => {
        setTrainees(data.trainees);
        setPendingNotes(data.pending_notes);
        setPendingCount(data.pending_count);
        if (dualRole && !platformAdmin && data.pending_count > 0) {
          setProviderTab("supervision");
        }
      })
      .catch((err) =>
        setSupervisionError(err instanceof Error ? err.message : "Failed to load supervision overview")
      )
      .finally(() => setLoadingSupervision(false));
  }, [token, supervisor, dualRole, platformAdmin]);

  const heroSubtitle = useMemo(() => {
    if (platformAdmin && !provider && !supervisor) {
      return "Manage approvals, users, and platform settings.";
    }
    if (dualRole && !platformAdmin) {
      return "Switch between your counseling practice and trainee supervision.";
    }
    if (supervisor && !provider) {
      return "Review trainee documentation and support your supervisees.";
    }
    if (provider) {
      return "Manage your schedule, sessions, and clinical documentation.";
    }
    return "Manage sessions, find counselors, and stay connected with your Tesfa care team.";
  }, [platformAdmin, provider, supervisor, dualRole]);

  async function handleCancel(id: string) {
    try {
      await cancelAppointment(id, "Cancelled by user");
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    }
  }

  if (!token) {
    return (
      <div className="page-shell">
        <SiteHeader showAuth={false} />
        <main className="flex flex-1 flex-col items-center justify-center page-pad py-12 text-center">
          <p className="text-base text-ethio-ink-muted">
            Not signed in.{" "}
            <Link href="/login" className="link-inline">
              Log in
            </Link>
          </p>
        </main>
      </div>
    );
  }

  const renderCounselorArea = () => (
    <CounselorDashboard
      user={user}
      appointments={appointments}
      loadingSessions={loadingSessions}
      error={error}
      onCancel={handleCancel}
    />
  );

  const renderSupervisionArea = () => (
    <SupervisionDashboard
      trainees={trainees}
      pendingNotes={pendingNotes}
      pendingCount={pendingCount}
      loading={loadingSupervision}
      error={supervisionError}
    />
  );

  return (
    <div className="page-shell">
      <SiteHeader showAuth={false} />

      <PageHero eyebrow="Your account" title="Your dashboard" subtitle={heroSubtitle} />

      <main className="mx-auto max-w-5xl page-pad pb-12 pt-6">
        {user && showPlatform && !showApprovals && !showCounseling && !showSupervision && (
          <AdminDashboardPanel user={user} />
        )}

        {user && showApprovals && !showPlatform && !showCounseling && !showSupervision && (
          <AdminDashboardPanel user={user} />
        )}

        {user && multiArea && (
          <>
            <AccountTabs
              active={accountTab}
              onChange={setAccountTab}
              showPlatform={showPlatform}
              showApprovals={showApprovals}
              showCounseling={showCounseling}
              showSupervision={showSupervision}
              pendingSupervision={pendingCount}
            />

            {accountTab === "platform" && showPlatform && <AdminDashboardPanel user={user} />}

            {accountTab === "approvals" && showApprovals && <AdminDashboardPanel user={user} />}

            {accountTab === "counseling" && showCounseling && renderCounselorArea()}

            {accountTab === "supervision" && showSupervision && renderSupervisionArea()}
          </>
        )}

        {!platformAdmin && !staffAdmin && dualRole && (
          <>
            <div className="mb-6">
              <DashboardTabs active={providerTab} onChange={setProviderTab} pendingCount={pendingCount} />
            </div>
            {providerTab === "counseling" && renderCounselorArea()}
            {providerTab === "supervision" && renderSupervisionArea()}
          </>
        )}

        {!platformAdmin && !staffAdmin && !dualRole && supervisor && renderSupervisionArea()}

        {!platformAdmin && !staffAdmin && !dualRole && provider && renderCounselorArea()}

        {!platformAdmin && !staffAdmin && !provider && !supervisor && (
          <>
            <div className="mb-6">
              <Link
                href="/counselors"
                className="card-vibrant flex min-h-[80px] items-center gap-3 p-4 active:bg-ethio-green/5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ethio-gradient text-lg text-white shadow-ethio">
                  🔍
                </span>
                <span className="text-base font-semibold text-ethio-green-dark">Find a counselor</span>
              </Link>
            </div>

            <section>
              <h2 className="text-lg font-bold text-ethio-ink">Upcoming sessions</h2>
              {loadingSessions && <p className="mt-3 text-sm text-ethio-ink-muted">Loading sessions…</p>}
              {!loadingSessions && error && (
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
                    <p className="font-semibold text-ethio-ink">{formatAppointmentWhen(appt, false)}</p>
                    <p className="text-xs text-ethio-ink-muted">{appointmentTimezoneLabel(appt, false)}</p>
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
                      <Link
                        href={`/counselors/${appt.provider_id}/book?reschedule=${appt.id}`}
                        className="text-sm font-semibold text-ethio-green-dark"
                      >
                        Reschedule
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleCancel(appt.id)}
                        className="text-sm font-semibold text-ethio-red"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
                {!loadingSessions && !error && appointments.length === 0 && (
                  <div className="card-vibrant p-5 text-center">
                    <p className="font-medium text-ethio-ink">No upcoming sessions</p>
                    <p className="mt-1 text-sm text-ethio-ink-muted">
                      Use <strong className="text-ethio-ink">Find a counselor</strong> above to book your first session.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
