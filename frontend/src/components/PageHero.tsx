import type { ReactNode } from "react";

type PageHeroProps = {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  centered?: boolean;
  children?: ReactNode;
};

export default function PageHero({
  eyebrow,
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  centered = false,
  children,
}: PageHeroProps) {
  return (
    <div className="page-hero">
      <div className={`mx-auto max-w-5xl page-pad py-8 sm:py-10 ${centered ? "text-center" : ""}`}>
        {backHref && (
          <a href={backHref} className="inline-flex items-center gap-1 text-sm font-semibold text-ethio-green-dark hover:text-ethio-green">
            ← {backLabel}
          </a>
        )}
        {eyebrow && (
          <p
            className={`surface-badge inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold shadow-sm ${backHref ? "mt-4" : ""}`}
          >
            <span className="h-2 w-2 rounded-full bg-ethio-green animate-pulse" aria-hidden />
            {eyebrow}
          </p>
        )}
        <h1
          className={`mt-4 font-extrabold leading-tight tracking-tight text-ethio-ink ${
            centered ? "mx-auto text-3xl sm:text-5xl lg:text-6xl" : "text-3xl sm:text-4xl"
          }`}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={`mt-3 max-w-2xl text-base leading-relaxed text-ethio-ink-muted sm:text-lg ${
              centered ? "mx-auto" : ""
            }`}
          >
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
