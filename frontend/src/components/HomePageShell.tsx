"use client";

import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import HomePageContent from "@/components/HomePageContent";
import type { Provider } from "@/lib/api";

type HomePageShellProps = {
  providers: Provider[];
};

export default function HomePageShell({ providers }: HomePageShellProps) {
  return (
    <div className="page-shell">
      <SiteHeader />
      <HomePageContent providers={providers} />
    </div>
  );
}
