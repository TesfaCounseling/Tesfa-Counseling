"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogoLink } from "@/components/BrandLogo";
import { clearAuthSession } from "@/lib/api";

type SiteHeaderProps = {
  showAuth?: boolean;
};

export { clearAuthSession };

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("access_token");
}

export default function SiteHeader({ showAuth = true }: SiteHeaderProps) {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

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
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 page-pad py-3 sm:py-4">
        <BrandLogoLink />

        <nav className="flex shrink-0 items-center gap-2 sm:gap-3">
          {loggedIn ? (
            <>
              <Link href="/dashboard" className="btn-ghost px-3 text-sm sm:px-4 sm:text-base">
                Dashboard
              </Link>
              <button type="button" onClick={handleLogout} className="btn-ghost px-3 text-sm sm:px-4 sm:text-base">
                Log out
              </button>
            </>
          ) : showAuth ? (
            <>
              <Link href="/login" className="btn-ghost px-3 text-sm sm:px-4 sm:text-base">
                Log in
              </Link>
              <Link href="/register" className="btn-header">
                Get started
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
