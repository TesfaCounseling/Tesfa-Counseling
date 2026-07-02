"use client";

import Link from "next/link";
import { BrandLogoLink } from "@/components/BrandLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/LanguageProvider";

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();

  return (
    <div className="page-shell flex flex-col">
      <div className="ethio-stripe-bar" />
      <header className="flex flex-wrap items-center justify-between gap-3 page-pad pt-[calc(0.75rem+var(--safe-top))]">
        <Link
          href="/"
          className="btn-nav-home inline-flex min-h-[44px] w-fit"
          aria-label={t("nav.home")}
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
          </svg>
          <span>{t("nav.home")}</span>
        </Link>
        <LanguageSwitcher compact />
      </header>

      <main className="relative flex flex-1 flex-col justify-center page-pad py-6 sm:py-10">
        <div className="pointer-events-none absolute inset-0 bg-ethio-hero-glow" aria-hidden />
        <div className="relative mx-auto w-full max-w-md">
          <div className="mb-6 text-center sm:text-left">
            <BrandLogoLink showSubtitle />
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-ethio-ink sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-base text-ethio-ink-muted">{subtitle}</p>}
          </div>
          <div className="card-vibrant p-5 sm:p-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
