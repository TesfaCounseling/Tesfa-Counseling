"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FeedbackPageLocationSetter from "@/components/FeedbackPageLocationSetter";
import ClientScheduleAlerts from "@/components/dashboard/ClientScheduleAlerts";
import ClientSessionsList from "@/components/dashboard/ClientSessionsList";
import { useLanguage } from "@/components/LanguageProvider";
import PageHero from "@/components/PageHero";
import SiteHeader from "@/components/SiteHeader";
import {
  acknowledgeScheduleChange,
  cancelAppointment,
  getMe,
  listAppointments,
  type Appointment,
} from "@/lib/api";
import { canManagePlatform, hasAdminAccess, isCounselorProvider, isSupervisor } from "@/lib/roles";

type KnownCounselor = {
  id: string;
  name: string;
  lastSessionAt: string;
};

function counselorsFromAppointments(appointments: Appointment[]): KnownCounselor[] {
  const byProvider = new Map<string, KnownCounselor>();
  for (const appt of appointments) {
    if (!appt.provider_id) continue;
    const existing = byProvider.get(appt.provider_id);
    if (!existing || appt.starts_at > existing.lastSessionAt) {
      byProvider.set(appt.provider_id, {
        id: appt.provider_id,
        name: appt.provider_name || "Counselor",
        lastSessionAt: appt.starts_at,
      });
    }
  }
  return Array.from(byProvider.values()).sort((a, b) => b.lastSessionAt.localeCompare(a.lastSessionAt));
}

export default function ClientSchedulePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [past, setPast] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPast, setShowPast] = useState(false);

  const loadSessions = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([listAppointments(true), listAppointments(false)])
      .then(([upcomingData, pastData]) => {
        setUpcoming(upcomingData.appointments);
        setPast(pastData.appointments);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load sessions"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("access_token")) {
      router.push("/login?next=/schedule");
      return;
    }
    getMe()
      .then((data) => {
        const user = data.user;
        if (isCounselorProvider(user) || isSupervisor(user) || canManagePlatform(user) || hasAdminAccess(user)) {
          router.replace("/dashboard");
          return;
        }
        loadSessions();
      })
      .catch(() => {
        router.push("/login?next=/schedule");
      });
  }, [router, loadSessions]);

  const counselors = useMemo(
    () => counselorsFromAppointments([...upcoming, ...past]),
    [upcoming, past]
  );

  async function handleCancel(id: string) {
    if (!window.confirm(t("schedule.cancelConfirm"))) return;
    try {
      await cancelAppointment(id);
      loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    }
  }

  async function handleDismissScheduleAlert(id: string) {
    try {
      await acknowledgeScheduleChange(id);
      setUpcoming((prev) =>
        prev.map((appt) => (appt.id === id ? { ...appt, schedule_alert: undefined } : appt))
      );
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="min-h-screen">
      <FeedbackPageLocationSetter screen="Client" tab="My schedule" />
      <SiteHeader />
      <main className="mx-auto max-w-3xl page-pad py-8 sm:py-10">
        <PageHero
          backHref="/dashboard"
          backLabel={t("schedule.backToDashboard")}
          eyebrow={t("schedule.pageEyebrow")}
          title={t("schedule.pageTitle")}
          subtitle={t("schedule.pageSubtitle")}
        />

        <ClientScheduleAlerts appointments={upcoming} onDismiss={handleDismissScheduleAlert} />

        <section className="mt-8">
          <h2 className="text-lg font-bold text-ethio-ink">{t("schedule.bookSectionTitle")}</h2>
          <p className="mt-1 text-sm text-ethio-ink-muted">{t("schedule.bookSectionHint")}</p>

          {loading && <p className="mt-3 text-sm text-ethio-ink-muted">{t("dashboard.loadingSessions")}</p>}

          {!loading && error && <p className="alert-error mt-3">{error}</p>}

          {!loading && !error && counselors.length === 0 && (
            <div className="card-vibrant mt-4 space-y-4 p-5 text-center">
              <p className="font-medium text-ethio-ink">{t("schedule.noCounselorYet")}</p>
              <p className="text-sm text-ethio-ink-muted">{t("schedule.noCounselorYetHint")}</p>
              <Link href="/counselors" className="btn-primary mx-auto sm:w-auto">
                {t("dashboard.findCounselor")}
              </Link>
            </div>
          )}

          {!loading && !error && counselors.length > 0 && (
            <div className="mt-4 space-y-3">
              {counselors.map((counselor, index) => (
                <div key={counselor.id} className="card-vibrant flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    {index === 0 && counselors.length > 1 && (
                      <p className="text-xs font-semibold uppercase tracking-wide text-ethio-green">
                        {t("schedule.yourCounselor")}
                      </p>
                    )}
                    {counselors.length === 1 && (
                      <p className="text-xs font-semibold uppercase tracking-wide text-ethio-green">
                        {t("schedule.yourCounselor")}
                      </p>
                    )}
                    <p className="mt-1 text-lg font-bold text-ethio-ink">{counselor.name}</p>
                  </div>
                  <Link
                    href={`/counselors/${counselor.id}/book`}
                    className="btn-primary sm:min-w-[200px] sm:w-auto"
                  >
                    {t("schedule.scheduleSession")}
                  </Link>
                </div>
              ))}
              <p className="pt-1 text-center text-sm text-ethio-ink-muted">
                <Link href="/counselors" className="link-inline">
                  {t("schedule.switchCounselor")}
                </Link>
              </p>
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-ethio-ink">{t("dashboard.upcomingSessions")}</h2>
          <ClientSessionsList
            appointments={upcoming}
            loading={loading}
            error=""
            onCancel={handleCancel}
          />
        </section>

        {!loading && past.length > 0 && (
          <section className="mt-10">
            <button
              type="button"
              onClick={() => setShowPast((v) => !v)}
              className="text-sm font-semibold text-ethio-green-dark"
            >
              {showPast ? t("schedule.hidePastSessions") : t("schedule.showPastSessions")}
              {` (${past.length})`}
            </button>
            {showPast && (
              <ClientSessionsList
                appointments={past}
                loading={false}
                error=""
                emptyTitleKey="schedule.noPastSessions"
                emptyHintKey="schedule.noPastSessionsHint"
                onCancel={handleCancel}
                showActions={false}
              />
            )}
          </section>
        )}
      </main>
    </div>
  );
}
