"use client";

import { useMemo, useState } from "react";
import ProviderCard from "@/components/ProviderCard";
import { useLanguage } from "@/components/LanguageProvider";
import type { Provider } from "@/lib/api";
import { collectLanguages, providerMatchesLanguage } from "@/lib/providerUtils";

type CounselorListProps = {
  providers: Provider[];
};

function displayLanguageName(lang: string, uiLang: "en" | "am") {
  if (uiLang === "am" && lang.toLowerCase() === "amharic") return "አማርኛ";
  if (uiLang === "am" && lang.toLowerCase() === "english") return "English";
  return lang;
}

export default function CounselorList({ providers }: CounselorListProps) {
  const { t, language } = useLanguage();
  const languages = useMemo(() => collectLanguages(providers), [providers]);
  const [languageFilter, setLanguageFilter] = useState("all");

  const filtered = useMemo(
    () => providers.filter((p) => providerMatchesLanguage(p, languageFilter)),
    [providers, languageFilter]
  );

  return (
    <>
      {languages.length > 0 && (
        <section className="card-vibrant mb-6 space-y-4 p-4 sm:p-5" aria-label={t("counselors.filterTitle")}>
          <div>
            <h2 className="text-sm font-bold text-ethio-ink">{t("counselors.filterTitle")}</h2>
            <p className="mt-1 text-sm text-ethio-ink-muted">{t("counselors.filterHint")}</p>
          </div>

          <label className="block text-sm font-medium text-ethio-ink">
            {t("counselors.language")}
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="input-field mt-1"
            >
              <option value="all">{t("counselors.allLanguages")}</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {displayLanguageName(lang, language)}
                </option>
              ))}
            </select>
          </label>
        </section>
      )}

      <p className="mb-4 text-sm text-ethio-ink-muted">
        {filtered.length}{" "}
        {filtered.length === 1 ? t("counselors.countOne") : t("counselors.countMany")}
        {languageFilter !== "all" && ` · ${displayLanguageName(languageFilter, language)}`}
      </p>

      <div className="space-y-5">
        {filtered.map((p) => (
          <ProviderCard key={p.id} provider={p} />
        ))}
      </div>

      {providers.length > 0 && filtered.length === 0 && (
        <div className="empty-state mt-6">
          <p className="font-semibold text-ethio-ink">{t("counselors.noMatch")}</p>
          <button type="button" onClick={() => setLanguageFilter("all")} className="btn-primary mt-4 text-sm">
            {t("counselors.showAll")}
          </button>
        </div>
      )}
    </>
  );
}
