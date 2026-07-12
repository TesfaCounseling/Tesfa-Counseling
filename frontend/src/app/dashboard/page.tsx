"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import AdminDashboardPanel from "@/components/admin/AdminDashboardPanel";
import AccountTabs, { type AccountTab } from "@/components/dashboard/AccountTabs";
import ClientFeedbackForm from "@/components/dashboard/ClientFeedbackForm";
import ClientScheduleAlerts from "@/components/dashboard/ClientScheduleAlerts";
import ClientSessionsList from "@/components/dashboard/ClientSessionsList";
import CounselorDashboard from "@/components/dashboard/CounselorDashboard";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import SupervisionDashboard from "@/components/dashboard/SupervisionDashboard";
import { syncLanguageFromProfile, useLanguage } from "@/components/LanguageProvider";
import SiteHeader from "@/components/SiteHeader";
import {
  acknowledgeScheduleChange,
  cancelAppointment,
  getMe,
  getSupervisionOverview,
  listAppointments,
  type Appointment,
  type AuthUser,
  type ClinicalNote,
  type SupervisionTrainee,
} from "@/lib/api";
import { isAppLanguage } from "@/lib/i18n";
import { useFeedbackPageLocation } from "@/lib/feedbackPageContext";
import type { FeedbackPageLocation } from "@/lib/feedbackPageContext";
import {
  canManagePlatform,
  hasAdminAccess,
  hasCounselorAndSupervisorRoles,
  isCounselorProvider,
  isSupervisor,
} from "@/lib/roles";

type ProviderTab = "counseling" | "supervision";

export default function DashboardPage() {
  const { t, setLanguage } = useLanguage();
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
      .then((data) => {
        setUser(data.user);
        if (isAppLanguage(data.user.preferred_language)) {
          setLanguage(data.user.preferred_language);
          syncLanguageFromProfile(data.user.preferred_language);
        }
      })
      .catch(() => {})
      .finally(() => setUserLoaded(true));
    listAppointments(true)
      .then((data) => setAppointments(data.appointments))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load sessions"))
      .finally(() => setLoadingSessions(false));
  }, []);

  useEffect(() => {
    if (!token) return;

    function refreshAppointments() {
      listAppointments(true)
        .then((data) => setAppointments(data.appointments))
        .catch(() => {});
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshAppointments();
      }
    }

    window.addEventListener("focus", refreshAppointments);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", refreshAppointments);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [token]);

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
    return t("dashboard.subtitleClient");
  }, [platformAdmin, provider, supervisor, dualRole, t]);

  const feedbackLocation = useMemo((): FeedbackPageLocation | null => {
    if (!userLoaded) return null;

    const accountTabLabels: Record<AccountTab, string> = {
      platform: "Platform admin",
      approvals: "Approvals",
      counseling: "Counseling",
      supervision: "Supervision",
    };

    if (multiArea) {
      const tab = accountTabLabels[accountTab];
      if (accountTab === "counseling") {
        return { screen: "Dashboard", tab, section: "Counselor home" };
      }
      if (accountTab === "supervision") {
        return { screen: "Dashboard", tab, section: "Supervisees" };
      }
      return { screen: "Dashboard", tab };
    }

    if (dualRole) {
      const tab = providerTab === "counseling" ? "Counseling" : "Supervision";
      const section = providerTab === "counseling" ? "Counselor home" : "Supervisees";
      return { screen: "Dashboard", tab, section };
    }

    if (provider) {
      return { screen: "Dashboard", tab: "Counseling", section: "Counselor home" };
    }
    if (supervisor) {
      return { screen: "Dashboard", tab: "Supervision", section: "Supervisees" };
    }

    return { screen: "Dashboard", tab: "Client", section: "Upcoming sessions" };
  }, [userLoaded, multiArea, accountTab, dualRole, providerTab, provider, supervisor]);

  useFeedbackPageLocation(feedbackLocation);

  async function handleCancel(id: string) {
    try {
      await cancelAppointment(id, "Cancelled by user");
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    }
  }

  async function handleDismissScheduleAlert(id: string) {
    try {
      await acknowledgeScheduleChange(id);
      setAppointments((prev) =>
        prev.map((appt) => (appt.id === id ? { ...appt, schedule_alert: undefined } : appt))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dismiss alert");
    }
  }

  if (!token) {
    return (
      <div className="page-shell">
        <SiteHeader showAuth={false} />
        <main className="flex flex-1 flex-col items-center justify-center page-pad py-12 text-center">
          <p className="text-base text-ethio-ink-muted">
            {t("dashboard.notSignedIn")}{" "}
            <Link href="/login" className="link-inline">
              {t("nav.login")}
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
      onDismissScheduleAlert={handleDismissScheduleAlert}
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

      <PageHero eyebrow={t("dashboard.account")} title={t("dashboard.title")} subtitle={heroSubtitle} />

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
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              <Link
                href="/counselors"
                className="card-vibrant flex min-h-[80px] items-center gap-3 p-4 active:bg-ethio-green/5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ethio-gradient text-lg text-white shadow-ethio">
                  🔍
                </span>
                <span className="text-base font-semibold text-ethio-green-dark">{t("dashboard.findCounselor")}</span>
              </Link>
              <Link
                href="/schedule"
                className="card-vibrant flex min-h-[80px] items-center gap-3 p-4 active:bg-ethio-green/5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ethio-gold-warm text-lg">
                  📅
                </span>
                <span className="text-base font-semibold text-ethio-ink">{t("dashboard.mySchedule")}</span>
              </Link>
            </div>

            <ClientScheduleAlerts appointments={appointments} onDismiss={handleDismissScheduleAlert} />

            <section>
              <h2 className="text-lg font-bold text-ethio-ink">{t("dashboard.upcomingSessions")}</h2>
              <ClientSessionsList
                appointments={appointments}
                loading={loadingSessions}
                error={error}
                onCancel={handleCancel}
              />
            </section>

            <ClientFeedbackForm />
          </>
        )}
      </main>
    </div>
  );
}
