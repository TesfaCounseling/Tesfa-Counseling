"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { SUPPORTED_LANGUAGES, type AppLanguage } from "@/lib/i18n";

type LanguageSwitcherProps = {
  compact?: boolean;
};

export default function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useLanguage();

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
            className={`min-h-[40px] rounded-lg px-2.5 text-xs font-bold transition sm:min-h-[44px] sm:px-3 sm:text-sm ${
              active
                ? "bg-ethio-green text-white shadow-sm"
                : "text-ethio-green-dark hover:bg-white/70"
            }`}
            aria-pressed={active}
          >
            {compact ? option.nativeLabel : option.nativeLabel}
          </button>
        );
      })}
    </div>
  );
}
