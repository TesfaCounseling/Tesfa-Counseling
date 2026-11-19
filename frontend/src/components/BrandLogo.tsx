import Link from "next/link";
import { appNameParts, TAGLINE, TESFA_GEEZ } from "@/lib/brand";

type BrandLogoProps = {
  className?: string;
  showSubtitle?: boolean;
};

export default function BrandLogo({ className = "", showSubtitle = false }: BrandLogoProps) {
  const { first, rest } = appNameParts();

  return (
    <div className={`flex min-w-0 max-w-full items-center gap-2.5 ${className}`}>
      <div className="relative flex h-10 w-11 shrink-0 items-center justify-center overflow-visible rounded-xl bg-ethio-gradient px-0.5 shadow-ethio sm:h-10 sm:w-11">
        <span className="text-[10px] font-bold leading-none text-white sm:text-[11px]" lang="am" aria-hidden>
          {TESFA_GEEZ}
        </span>
        <span className="pointer-events-none absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-ethio-cream bg-ethio-gold" />
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
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
