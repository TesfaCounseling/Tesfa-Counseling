import Link from "next/link";
import { appNameParts, TAGLINE, TESFA_GEEZ } from "@/lib/brand";

type BrandLogoProps = {
  className?: string;
  showSubtitle?: boolean;
};

export default function BrandLogo({ className = "", showSubtitle = false }: BrandLogoProps) {
  const { first, rest } = appNameParts();

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ethio-gradient shadow-ethio sm:h-10 sm:w-10">
        <span className="text-base font-bold text-white sm:text-lg" aria-hidden>
          {TESFA_GEEZ}
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-ethio-cream bg-ethio-gold" />
      </div>
      <div className="min-w-0">
        <span className="block truncate text-base font-bold leading-tight sm:text-lg">
          <span className="text-ethio-green-dark">{first}</span>
          {rest ? <> <span className="text-ethio-ink">{rest}</span></> : null}
        </span>
        {showSubtitle && (
          <span className="block truncate text-xs font-medium text-ethio-green">{TAGLINE}</span>
        )}
      </div>
    </div>
  );
}

export function BrandLogoLink({ showSubtitle = false }: { showSubtitle?: boolean }) {
  return (
    <Link href="/" className="min-w-0">
      <BrandLogo showSubtitle={showSubtitle} />
    </Link>
  );
}
