"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { AMHARIC_UI_ENABLED } from "@/lib/featureFlags";
import { SUPPORTED_LANGUAGES, type AppLanguage } from "@/lib/i18n";

type LanguageSwitcherProps = {
  compact?: boolean;
};

export default function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useLanguage();

  if (!AMHARIC_UI_ENABLED) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-1 rounded-xl border border-ethio-green/20 bg-ethio-surface-warm p-1 ${
        compact ? "" : "sm:gap-1.5"
      }`}
      role="group"
      aria-label={t("lang.choose")}
    >
      {SUPPORTED_LANGUAGES.map((option) => {
        const active = language === option.code;
        return (
          <button
            key={option.code}
            type="button"
            onClick={() => setLanguage(option.code as AppLanguage)}
            className={`min-h-[44px] rounded-lg px-3 text-base font-bold transition ${
              active
                ? "bg-ethio-green text-white shadow-sm"
                : "text-ethio-green-dark hover:bg-white/70"
            }`}
            aria-pressed={active}
          >
            {option.nativeLabel}
          </button>
        );
      })}
    </div>
  );
}
