"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import type { Provider } from "@/lib/api";
import { parseProviderTags, resolveProviderPhotoUrl } from "@/lib/providerUtils";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function tags(value: string | null | undefined, limit = 4) {
  return parseProviderTags(value).slice(0, limit);
}

type ProviderCardProps = {
  provider: Provider;
};

export default function ProviderCard({ provider }: ProviderCardProps) {
  const { t } = useLanguage();
  const specialtyTags = tags(provider.specializations);
  const languageTags = tags(provider.languages);

  return (
    <article className="provider-card">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <ProviderAvatar name={provider.full_name} photoUrl={provider.photo_url} size="lg" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-ethio-ink">{provider.full_name}</h2>
              <p className="mt-1 text-sm font-semibold capitalize text-ethio-green">
                {provider.type === "trainee" ? t("provider.supervisedTrainee") : t("provider.licensedCounselor")}
              </p>
            </div>
            <span className="provider-badge">{t("provider.availableOnline")}</span>
          </div>

          {provider.bio && (
            <p className="mt-3 text-sm leading-relaxed text-ethio-ink-muted line-clamp-2">{provider.bio}</p>
          )}

          {specialtyTags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {specialtyTags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {languageTags.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-ethio-ink-muted">
              <span className="text-base" aria-hidden>
                🗣️
              </span>
              {languageTags.join(" · ")}
            </p>
          )}

          {provider.program_name && (
            <p className="mt-2 text-xs font-medium text-ethio-ink-muted">
              {t("provider.program")}: {provider.program_name}
            </p>
          )}

          <ul className="trust-list mt-4">
            <li>{t("provider.secureVideo")}</li>
            <li>{t("provider.flexibleScheduling")}</li>
            <li>{t("provider.slidingScale")}</li>
          </ul>
        </div>
      </div>

      <div
        className="mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderColor: "rgba(4, 107, 210, 0.1)" }}
      >
        <p className="text-sm text-ethio-ink-muted">
          <span className="font-semibold text-ethio-ink">{t("provider.nextStepLabel")}</span>{" "}
          {t("provider.nextStepText")}
        </p>
        <Link href={`/counselors/${provider.id}/book`} className="btn-primary sm:min-w-[200px] sm:w-auto">
          {t("provider.viewAvailability")}
        </Link>
      </div>
    </article>
  );
}

export function ProviderAvatar({
  name,
  photoUrl,
  size = "lg",
}: {
  name: string;
  photoUrl?: string | null;
  size?: "md" | "lg";
}) {
  const className = `${size === "lg" ? "provider-avatar" : "provider-avatar provider-avatar-sm"} shrink-0`;
  const resolvedPhoto = resolveProviderPhotoUrl(photoUrl);

  if (resolvedPhoto) {
    return <img src={resolvedPhoto} alt="" className={`${className} object-cover`} loading="lazy" />;
  }

  return (
    <div className={className} aria-hidden>
      {initials(name)}
    </div>
  );
}
