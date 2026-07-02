"use client";

import Link from "next/link";
import PageHero from "@/components/PageHero";
import WhoWeServe from "@/components/WhoWeServe";
import HomeCounselorSpotlight from "@/components/HomeCounselorSpotlight";
import { useLanguage } from "@/components/LanguageProvider";
import { APP_NAME, TESFA_GEEZ } from "@/lib/brand";
import type { Provider } from "@/lib/api";

type HomePageContentProps = {
  providers: Provider[];
};

export default function HomePageContent({ providers }: HomePageContentProps) {
  const { t } = useLanguage();

  const features = [
    {
      icon: "🌍",
      tone: "bg-ethio-green/10 text-ethio-green-dark",
      title: t("home.feature.diaspora.title"),
      desc: t("home.feature.diaspora.desc"),
    },
    {
      icon: "🗣️",
      tone: "bg-ethio-gold-warm text-ethio-green-dark",
      title: t("home.feature.culture.title"),
      desc: t("home.feature.culture.desc"),
    },
    {
      icon: "👨‍👩‍👧",
      tone: "bg-ethio-red/10 text-ethio-red",
      title: t("home.feature.life.title"),
      desc: t("home.feature.life.desc"),
    },
  ];

  return (
    <>
      <PageHero
        centered
        eyebrow={t("home.eyebrow")}
        title={
          <>
            <span className="brand-text">{TESFA_GEEZ}</span>{" "}
            <span className="font-bold text-[#EBBF13]">— {t("home.heroGold")},</span>{" "}
            <span className="brand-text">{t("home.heroRest")}</span>
          </>
        }
        subtitle={t("home.subtitle")}
      >
        <div className="mx-auto mt-9 flex max-w-sm flex-col items-center gap-4 sm:mt-11">
          <a href="/counselors" className="btn-cta">
            {t("home.findCounselor")}
          </a>
          <p className="text-sm text-ethio-ink-muted">
            <a href="/register" className="link-inline">
              {t("home.counselorApply")}
            </a>
          </p>
        </div>
      </PageHero>

      <section className="mx-auto max-w-5xl page-pad py-8 sm:py-12">
        <div className="card-vibrant p-6 sm:p-8">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-ethio-green">
            {t("home.missionEyebrow")}
          </p>
          <div className="mx-auto mt-5 max-w-3xl space-y-5 text-center">
            <p className="text-sm leading-relaxed text-ethio-ink-muted sm:text-base">{t("home.missionText")}</p>
            <div className="border-t border-ethio-green/15 pt-5">
              <p className="text-sm font-medium leading-relaxed text-ethio-green-dark sm:text-base">
                {t("home.tesfaMeaning")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <WhoWeServe />

      <HomeCounselorSpotlight providers={providers} />

      <section className="pb-10 sm:pb-16">
        <div className="mx-auto grid max-w-5xl gap-4 page-pad sm:grid-cols-3 sm:gap-6">
          {features.map((item) => (
            <div key={item.title} className="card-vibrant p-5 sm:p-6">
              <div className={`feature-icon ${item.tone}`}>{item.icon}</div>
              <h3 className="text-base font-bold text-ethio-ink sm:text-lg">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ethio-ink-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="site-footer border-t page-pad py-8 text-center">
        <div className="mx-auto mb-3 h-1 max-w-[120px] rounded-full bg-ethio-stripe" />
        <p className="text-sm text-ethio-ink-muted">{t("home.crisis")}</p>
        <p className="mt-2 text-xs font-medium text-ethio-green">
          {APP_NAME} · {t("home.tagline")}
        </p>
      </footer>
    </>
  );
}
