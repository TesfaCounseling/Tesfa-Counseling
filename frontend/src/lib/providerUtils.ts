import type { Provider } from "@/lib/api";

export function parseProviderTags(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function providerLanguages(provider: Provider): string[] {
  return parseProviderTags(provider.languages);
}

export function collectLanguages(providers: Provider[]): string[] {
  const seen = new Map<string, string>();
  for (const provider of providers) {
    for (const lang of providerLanguages(provider)) {
      const key = lang.toLowerCase();
      if (!seen.has(key)) seen.set(key, lang);
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

export function providerMatchesLanguage(provider: Provider, language: string): boolean {
  if (!language || language === "all") return true;
  const needle = language.toLowerCase();
  return providerLanguages(provider).some((lang) => lang.toLowerCase() === needle);
}
