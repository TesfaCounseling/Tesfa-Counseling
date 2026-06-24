"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import PageHero from "@/components/PageHero";
import AdminDashboardPanel from "@/components/admin/AdminDashboardPanel";
import { getMe, type AuthUser } from "@/lib/api";
import { hasAdminAccess } from "@/lib/roles";
import { clearAuthSession } from "@/components/SiteHeader";
import { formatStatusLabel } from "@/lib/format";

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("access_token");
    setToken(t);
    if (!t) {
      setLoading(false);
      return;
    }

    getMe()
      .then((data) => {
        setUser(data.user);
        if (hasAdminAccess(data.user)) {
          router.replace("/dashboard");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (!token) {
    return (
      <div className="page-shell">
        <SiteHeader showAuth={false} />
        <PageHero
          eyebrow="Admin"
          title="Sign in required"
          subtitle="The admin dashboard requires an administrator account."
          backHref="/"
          backLabel="Home"
        />
        <main className="mx-auto max-w-5xl page-pad pb-12 text-center">
          <Link href="/login?next=/dashboard" className="btn-primary inline-block">
            Log in
          </Link>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-shell">
        <SiteHeader showAuth={false} />
        <main className="mx-auto max-w-5xl page-pad py-16 text-center text-ethio-ink-muted">Loading…</main>
      </div>
    );
  }

  if (!user || !hasAdminAccess(user)) {
    const roleLabel = user?.roles.length
      ? user.roles.map((r) => formatStatusLabel(r.role)).join(", ")
      : user?.account_type
        ? formatStatusLabel(user.account_type)
        : "unknown";

    return (
      <div className="page-shell">
        <SiteHeader showAuth={false} />
        <PageHero
          eyebrow="Admin"
          title="Access denied"
          subtitle="Your current account does not have admin permissions."
          backHref="/dashboard"
          backLabel="Dashboard"
        />
        <main className="mx-auto max-w-5xl page-pad pb-12">
          <div className="card-vibrant space-y-4 p-6">
            {user ? (
              <p className="text-sm text-ethio-ink">
                You are signed in as <strong>{user.email}</strong> ({roleLabel}).
              </p>
            ) : (
              <p className="text-sm text-ethio-ink">We could not verify your account.</p>
            )}
            <p className="text-sm text-ethio-ink-muted">
              Admin access requires a <strong>platform admin</strong> or <strong>supervisor</strong> account.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                className="btn-primary text-sm"
                onClick={() => {
                  clearAuthSession();
                  window.location.href = "/login?next=/dashboard";
                }}
              >
                Sign in with admin account
              </button>
              <Link href="/dashboard" className="rounded-lg border border-ethio-border px-4 py-2 text-sm font-semibold text-ethio-ink-muted">
                Go to dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <SiteHeader showAuth={false} />
      <main className="mx-auto max-w-5xl page-pad py-16 text-center text-ethio-ink-muted">Redirecting to dashboard…</main>
    </div>
  );
}
