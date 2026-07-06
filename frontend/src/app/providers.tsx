"use client";

import { LanguageProvider } from "@/components/LanguageProvider";
import BetaFeedbackWidget from "@/components/BetaFeedbackWidget";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      {children}
      <BetaFeedbackWidget />
    </LanguageProvider>
  );
}
