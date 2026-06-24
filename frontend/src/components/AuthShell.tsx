"use client";

import Link from "next/link";
import { BrandLogoLink } from "@/components/BrandLogo";

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="page-shell flex flex-col">
      <div className="ethio-stripe-bar" />
      <header className="page-pad pt-[calc(0.75rem+var(--safe-top))]">
        <Link href="/" className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-ethio-green-dark">
          <span aria-hidden>←</span> Back
        </Link>
      </header>

      <main className="relative flex flex-1 flex-col justify-center page-pad py-6 sm:py-10">
        <div className="pointer-events-none absolute inset-0 bg-ethio-hero-glow" aria-hidden />
        <div className="relative mx-auto w-full max-w-md">
          <div className="mb-6 text-center sm:text-left">
            <BrandLogoLink showSubtitle />
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-ethio-ink sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-base text-ethio-ink-muted">{subtitle}</p>}
          </div>
          <div className="card-vibrant p-5 sm:p-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
