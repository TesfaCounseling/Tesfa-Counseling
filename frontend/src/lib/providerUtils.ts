import type { Provider } from "@/lib/api";
import { getApiOrigin } from "@/lib/apiBase";

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

export function counselorBriefIntro(provider: Provider): string {
  if (provider.bio?.trim()) return provider.bio.trim();

  const specialties = parseProviderTags(provider.specializations);
  const languages = providerLanguages(provider);

  if (specialties.length > 0 && languages.length > 0) {
    const specialtyPreview =
      specialties.length > 2 ? `${specialties.slice(0, 2).join(", ")}, and more` : specialties.join(", ");
    const languagePreview =
      languages.length > 3 ? `${languages.slice(0, 3).join(", ")}, and more` : languages.join(", ");
    return `Counseling focused on ${specialtyPreview}. Sessions offered in ${languagePreview}.`;
  }

  if (specialties.length > 0) {
    return `Counseling focused on ${specialties.join(", ")}.`;
  }

  if (languages.length > 0) {
    return `Licensed counselor offering sessions in ${languages.join(", ")}.`;
  }

  return "Licensed counselor available for secure online sessions.";
}

export function resolveProviderPhotoUrl(photoUrl: string | null | undefined): string | null {
  if (!photoUrl) return null;
  if (photoUrl.startsWith("http")) return photoUrl;
  const apiRoot = getApiOrigin();
  return `${apiRoot}${photoUrl.startsWith("/") ? photoUrl : `/${photoUrl}`}`;
}
