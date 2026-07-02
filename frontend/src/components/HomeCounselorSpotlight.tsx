"use client";

import Link from "next/link";
import { ProviderAvatar } from "@/components/ProviderCard";
import { useLanguage } from "@/components/LanguageProvider";
import { formatTranslation } from "@/lib/i18n";
import type { Provider } from "@/lib/api";
import { counselorBriefIntro, parseProviderTags } from "@/lib/providerUtils";

const HOMEPAGE_LIMIT = 6;

const TEAM_TONES = ["team-card--green", "team-card--gold", "team-card--red"] as const;

type HomeCounselorSpotlightProps = {
  providers: Provider[];
};

export default function HomeCounselorSpotlight({ providers }: HomeCounselorSpotlightProps) {
  const { t, language } = useLanguage();
  const featured = providers.slice(0, HOMEPAGE_LIMIT);

  return (
    <section className="mx-auto max-w-5xl page-pad py-8 sm:py-12">
      <div className="card-vibrant p-6 sm:p-8">
        <div className="mb-6 text-center sm:mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ethio-green">{t("home.meetTeamEyebrow")}</p>
          <h2 className="mt-2 text-2xl font-extrabold text-ethio-ink sm:text-3xl">{t("home.meetTeamTitle")}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-ethio-ink-muted sm:text-base">
            {t("home.meetTeamSubtitle")}
          </p>
        </div>

        {featured.length === 0 ? (
          <div className="rounded-2xl border-2 border-ethio-green/20 bg-ethio-surface-warm p-8 text-center">
            <p className="font-semibold text-ethio-ink">{t("home.teamEmptyTitle")}</p>
            <p className="mt-2 text-sm text-ethio-ink-muted">{t("home.teamEmptyDesc")}</p>
            <Link href="/counselors" className="btn-secondary mt-5 inline-flex text-sm">
              {t("home.findCounselor")}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((provider, index) => {
                const specialtyPreview = parseProviderTags(provider.specializations).slice(0, 2);
                const tone = TEAM_TONES[index % TEAM_TONES.length];

                return (
                  <article key={provider.id} className={`team-card ${tone}`}>
                    <span className="team-card-glow" aria-hidden />
                    <div className="relative z-10 flex gap-4">
                      <ProviderAvatar name={provider.full_name} photoUrl={provider.photo_url} size="md" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-ethio-ink">{provider.full_name}</h3>
                        <p className="text-xs font-semibold text-ethio-green-dark">{t("home.licensedCounselor")}</p>
                      </div>
                    </div>

                    <p className="relative z-10 mt-4 text-sm leading-relaxed text-ethio-ink-muted line-clamp-3">
                      {counselorBriefIntro(provider)}
                    </p>

                    {specialtyPreview.length > 0 && (
                      <div className="relative z-10 mt-3 flex flex-wrap gap-1.5">
                        {specialtyPreview.map((tag) => (
                          <span key={tag} className="team-tag-chip">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <Link
                      href={`/counselors/${provider.id}/book`}
                      className="relative z-10 link-inline mt-4 inline-block text-sm font-semibold"
                    >
                      {t("home.viewAvailability")} →
                    </Link>
                  </article>
                );
              })}
            </div>

            <div className="mt-8 text-center">
              <Link href="/counselors" className="btn-primary sm:inline-flex sm:w-auto">
                {providers.length > HOMEPAGE_LIMIT
                  ? formatTranslation(language, "home.viewAllCounselors", { count: providers.length })
                  : t("home.browseAllCounselors")}
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
