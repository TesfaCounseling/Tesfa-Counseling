"use client";

import { useMemo, useState } from "react";
import ProviderCard from "@/components/ProviderCard";
import type { Provider } from "@/lib/api";
import { collectLanguages, providerMatchesLanguage } from "@/lib/providerUtils";

type CounselorListProps = {
  providers: Provider[];
};

export default function CounselorList({ providers }: CounselorListProps) {
  const languages = useMemo(() => collectLanguages(providers), [providers]);
  const [language, setLanguage] = useState("all");

  const filtered = useMemo(
    () => providers.filter((p) => providerMatchesLanguage(p, language)),
    [providers, language]
  );

  return (
    <>
      {languages.length > 0 && (
        <section className="card-vibrant mb-6 space-y-4 p-4 sm:p-5" aria-label="Filter counselors">
          <div>
            <h2 className="text-sm font-bold text-ethio-ink">Find your match</h2>
            <p className="mt-1 text-sm text-ethio-ink-muted">Filter by language.</p>
          </div>

          <label className="block text-sm font-medium text-ethio-ink">
            Language
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input-field mt-1">
              <option value="all">All languages</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </label>
        </section>
      )}

      <p className="mb-4 text-sm text-ethio-ink-muted">
        {filtered.length} counselor{filtered.length === 1 ? "" : "s"}
        {language !== "all" && ` · ${language}`}
      </p>

      <div className="space-y-5">
        {filtered.map((p) => (
          <ProviderCard key={p.id} provider={p} />
        ))}
      </div>

      {providers.length > 0 && filtered.length === 0 && (
        <div className="empty-state mt-6">
          <p className="font-semibold text-ethio-ink">No counselors match this language</p>
          <button type="button" onClick={() => setLanguage("all")} className="btn-primary mt-4 text-sm">
            Show all counselors
          </button>
        </div>
      )}
    </>
  );
}
