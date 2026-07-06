"use client";

import { LanguageProvider } from "@/components/LanguageProvider";
import BetaFeedbackWidget from "@/components/BetaFeedbackWidget";
import { FeedbackPageProvider } from "@/lib/feedbackPageContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <FeedbackPageProvider>
        {children}
        <BetaFeedbackWidget />
      </FeedbackPageProvider>
    </LanguageProvider>
  );
}
