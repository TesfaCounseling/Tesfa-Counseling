"use client";

import PageHero from "@/components/PageHero";
import { useLanguage } from "@/components/LanguageProvider";

export default function CounselorsPageHero() {
  const { t } = useLanguage();

  return (
    <PageHero
      eyebrow={t("counselors.eyebrow")}
      title={t("counselors.title")}
      subtitle={t("counselors.subtitle")}
    />
  );
}
