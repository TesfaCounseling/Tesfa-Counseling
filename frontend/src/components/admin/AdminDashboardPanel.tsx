"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminTabNav, { type AdminSection } from "@/components/admin/AdminTabNav";
import AdminOverviewPanel from "@/components/admin/AdminOverviewPanel";
import AdminApprovals from "@/components/admin/AdminApprovals";
import AdminProviders from "@/components/admin/AdminProviders";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminAuditLog from "@/components/admin/AdminAuditLog";
import AdminOrganizations from "@/components/admin/AdminOrganizations";
import AdminStatisticsPanel from "@/components/admin/AdminStatisticsPanel";
import { getAdminOverview, type AdminOverview, type AuthUser } from "@/lib/api";
import { canManagePlatform, canReviewCounselors } from "@/lib/roles";

type AdminDashboardPanelProps = {
  user: AuthUser;
};

export default function AdminDashboardPanel({ user }: AdminDashboardPanelProps) {
  const [section, setSection] = useState<AdminSection>("overview");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const platformAdmin = canManagePlatform(user);

  const loadOverview = useCallback(async () => {
    const data = await getAdminOverview();
    setOverview(data);
    setPendingCount(data.pending_counselors + data.pending_trainees);
  }, []);

  useEffect(() => {
    loadOverview()
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load admin dashboard"))
      .finally(() => setLoading(false));
  }, [loadOverview]);

  const tabs = useMemo(() => {
    const items: { id: AdminSection; label: string; badge?: number }[] = [
      { id: "overview", label: "Overview" },
      { id: "approvals", label: "Approvals", badge: pendingCount },
    ];
    if (platformAdmin) {
      items.push(
        { id: "statistics", label: "Statistics" },
        { id: "providers", label: "Providers" },
        { id: "users", label: "Users" },
        { id: "audit", label: "Activity" },
        { id: "organizations", label: "Organizations" }
      );
    }
    return items;
  }, [platformAdmin, pendingCount]);

  if (loading) {
    return <p className="text-sm text-ethio-ink-muted">Loading platform overview…</p>;
  }

  return (
    <div>
      <AdminTabNav tabs={tabs} active={section} onChange={setSection} />

      {error && <p className="mb-4 alert-error">{error}</p>}

      {section === "overview" && overview && (
        <AdminOverviewPanel
          stats={overview}
          showCounselorPending={canReviewCounselors(user)}
          onGoToApprovals={() => setSection("approvals")}
          onGoToStatistics={platformAdmin ? () => setSection("statistics") : undefined}
        />
      )}

      {section === "statistics" && platformAdmin && <AdminStatisticsPanel />}

      {section === "approvals" && (
        <AdminApprovals
          user={user}
          onPendingChange={(count) => {
            setPendingCount(count);
            loadOverview().catch(() => {});
          }}
        />
      )}

      {section === "providers" && platformAdmin && <AdminProviders />}
      {section === "users" && platformAdmin && <AdminUsers />}
      {section === "audit" && platformAdmin && <AdminAuditLog />}
      {section === "organizations" && platformAdmin && <AdminOrganizations />}
    </div>
  );
}
