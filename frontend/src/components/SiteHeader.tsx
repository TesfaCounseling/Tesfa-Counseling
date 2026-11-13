"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogoLink } from "@/components/BrandLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/LanguageProvider";
import { clearAuthSession, getMe, type AuthUser } from "@/lib/api";

type SiteHeaderProps = {
  showAuth?: boolean;
  /** When a parent already loaded the user, pass it to avoid an extra /me call. */
  user?: AuthUser | null;
};

export { clearAuthSession };

function HomeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function ProfileFaceIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5c1.6-3.2 4.1-4.8 7-4.8s5.4 1.6 7 4.8" strokeLinecap="round" />
    </svg>
  );
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("access_token");
}

export default function SiteHeader({ showAuth = true, user: userProp = null }: SiteHeaderProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(userProp);
  const onHomePage = pathname === "/";

  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, [pathname]);

  useEffect(() => {
    if (userProp) {
      setUser(userProp);
      return;
    }
    if (!loggedIn) {
      setUser(null);
      return;
    }
    let cancelled = false;
    getMe()
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [loggedIn, userProp, pathname]);

  function handleLogout() {
    clearAuthSession();
    setLoggedIn(false);
    setUser(null);
    window.location.href = "/";
  }

  const displayName = user?.first_name?.trim() || user?.full_name?.trim() || "";

  return (
    <header className="site-header sticky top-0 z-50 pt-[var(--safe-top)]">
      <div className="ethio-stripe-bar" />
      <div className="mx-auto max-w-5xl page-pad py-3 sm:py-4">
        <div className="flex flex-col gap-2 sm:gap-0">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <BrandLogoLink />

            <nav
              className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2"
              aria-label={t("nav.main")}
            >
              <div className="hidden sm:block">
                <LanguageSwitcher compact />
              </div>

              {!onHomePage && (
                <Link href="/" className="btn-nav-home" aria-label={t("nav.home")}>
                  <HomeIcon />
                  <span>{t("nav.home")}</span>
                </Link>
              )}

              {loggedIn ? (
                <>
                  {user && (
                    <Link
                      href="/dashboard"
                      className="inline-flex max-w-[11rem] items-center gap-2 rounded-full border border-ethio-border bg-white/80 py-1 pl-1 pr-2.5 text-sm font-semibold text-ethio-ink shadow-sm sm:max-w-[16rem] sm:pr-3"
                      title={user.email}
                      aria-label={`${t("nav.signedInAs")} ${user.full_name || user.email}`}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ethio-gradient text-white"
                        aria-hidden
                      >
                        <ProfileFaceIcon />
                      </span>
                      <span className="truncate">{displayName || user.email}</span>
                    </Link>
                  )}
                  <Link href="/dashboard" className="btn-ghost px-2.5 text-sm sm:px-4 sm:text-base">
                    {t("nav.dashboard")}
                  </Link>
                  <button type="button" onClick={handleLogout} className="btn-ghost px-2.5 text-sm sm:px-4 sm:text-base">
                    {t("nav.logout")}
                  </button>
                </>
              ) : showAuth ? (
                <Link href="/login" className="btn-ghost px-2.5 text-sm sm:px-4 sm:text-base">
                  {t("nav.login")}
                </Link>
              ) : null}
            </nav>
          </div>

          <div className="flex justify-center sm:hidden">
            <LanguageSwitcher compact />
          </div>
        </div>
      </div>
    </header>
  );
}
