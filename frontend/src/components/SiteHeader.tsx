"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogoLink } from "@/components/BrandLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/LanguageProvider";
import { clearAuthSession } from "@/lib/api";

type SiteHeaderProps = {
  showAuth?: boolean;
};

export { clearAuthSession };

function HomeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
    </svg>
  );
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("access_token");
}

export default function SiteHeader({ showAuth = true }: SiteHeaderProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [loggedIn, setLoggedIn] = useState(false);
  const onHomePage = pathname === "/";

  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, [pathname]);

  function handleLogout() {
    clearAuthSession();
    setLoggedIn(false);
    window.location.href = "/";
  }

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
