import Link from "next/link";
import type { Provider } from "@/lib/api";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

import { parseProviderTags } from "@/lib/providerUtils";

function tags(value: string | null | undefined, limit = 4) {
  return parseProviderTags(value).slice(0, limit);
}
type ProviderCardProps = {
  provider: Provider;
};

export default function ProviderCard({ provider }: ProviderCardProps) {
  const specialtyTags = tags(provider.specializations);
  const languageTags = tags(provider.languages);

  return (
    <article className="provider-card">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="provider-avatar shrink-0" aria-hidden>
          {initials(provider.full_name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-ethio-ink">{provider.full_name}</h2>
              <p className="mt-1 text-sm font-semibold capitalize text-ethio-green">
                {provider.type === "trainee" ? "Supervised trainee" : "Licensed counselor"}
              </p>
            </div>
            <span className="provider-badge">Available online</span>
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
            <p className="mt-2 text-xs font-medium text-ethio-ink-muted">Program: {provider.program_name}</p>
          )}

          <ul className="trust-list mt-4">
            <li>Secure video session</li>
            <li>Flexible scheduling</li>
            <li>Pro bono options</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "rgba(4, 107, 210, 0.1)" }}>
        <p className="text-sm text-ethio-ink-muted">
          <span className="font-semibold text-ethio-ink">Next step:</span> pick a time that works for you
        </p>
        <Link href={`/counselors/${provider.id}/book`} className="btn-primary sm:min-w-[200px] sm:w-auto">
          View availability
        </Link>
      </div>
    </article>
  );
}

export function ProviderAvatar({ name, size = "lg" }: { name: string; size?: "md" | "lg" }) {
  return (
    <div className={size === "lg" ? "provider-avatar" : "provider-avatar provider-avatar-sm"} aria-hidden>
      {initials(name)}
    </div>
  );
}
