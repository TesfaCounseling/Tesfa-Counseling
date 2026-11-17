import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.providerSchedule;

export default function ProviderScheduleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
