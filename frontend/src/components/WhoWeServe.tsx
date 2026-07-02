"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

const audienceKeys = [
  {
    id: "individuals",
    labelKey: "serve.individuals.label" as const,
    blurbKey: "serve.individuals.blurb" as const,
    icon: "🧑",
    tone: "audience-tile--green",
    iconTone: "audience-icon--green",
  },
  {
    id: "couples",
    labelKey: "serve.couples.label" as const,
    blurbKey: "serve.couples.blurb" as const,
    icon: "💑",
    tone: "audience-tile--gold",
    iconTone: "audience-icon--gold",
  },
  {
    id: "families",
    labelKey: "serve.families.label" as const,
    blurbKey: "serve.families.blurb" as const,
    icon: "👨‍👩‍👧‍👦",
    tone: "audience-tile--red",
    iconTone: "audience-icon--red",
  },
  {
    id: "young-adults",
    labelKey: "serve.youngAdults.label" as const,
    blurbKey: "serve.youngAdults.blurb" as const,
    icon: "🌱",
    tone: "audience-tile--mint",
    iconTone: "audience-icon--mint",
  },
] as const;

export default function WhoWeServe() {
  const { t } = useLanguage();

  return (
    <section className="mx-auto max-w-5xl page-pad py-8 sm:py-12">
      <div className="card-vibrant p-6 sm:p-8">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-ethio-green">
          {t("serve.title")}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {audienceKeys.map((item, index) => (
            <Link
              key={item.id}
              href="/counselors"
              className={`group audience-tile ${item.tone}`}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <span className="audience-tile-glow" aria-hidden />
              <span className={`audience-icon ${item.iconTone}`} aria-hidden>
                {item.icon}
              </span>
              <span className="audience-label">{t(item.labelKey)}</span>
              <span className="audience-blurb">{t(item.blurbKey)}</span>
              <span className="audience-cta">
                {t("serve.findSupport")}
                <span className="audience-cta-arrow" aria-hidden>
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
