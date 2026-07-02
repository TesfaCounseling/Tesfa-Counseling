"use client";

import { LanguageProvider } from "@/components/LanguageProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
