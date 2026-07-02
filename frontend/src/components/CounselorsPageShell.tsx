"use client";

import SiteHeader from "@/components/SiteHeader";
import CounselorsPageHero from "@/components/CounselorsPageHero";
import CounselorList from "@/components/CounselorList";
import { useLanguage } from "@/components/LanguageProvider";
import { APP_NAME } from "@/lib/brand";
import type { Provider } from "@/lib/api";

type CounselorsPageShellProps = {
  providers: Provider[];
  error: string | null;
};

export default function CounselorsPageShell({ providers, error }: CounselorsPageShellProps) {
  const { t } = useLanguage();

  return (
    <div className="page-shell">
      <SiteHeader />
      <CounselorsPageHero />
      <main className="mx-auto max-w-5xl page-pad pb-12 pt-6">
        {error && <p className="alert-error">{error}</p>}
        {!error && providers.length > 0 && <CounselorList providers={providers} />}
        {!error && providers.length === 0 && (
          <div className="empty-state mt-6">
            <span className="text-3xl" aria-hidden>
              🔍
            </span>
            <p className="mt-3 font-semibold text-ethio-ink">{t("counselors.empty")}</p>
          </div>
        )}
      </main>
      <footer className="site-footer mt-8 border-t page-pad py-6 text-center">
        <p className="text-xs font-medium text-ethio-green">
          {APP_NAME} · {t("home.tagline")}
        </p>
      </footer>
    </div>
  );
}
