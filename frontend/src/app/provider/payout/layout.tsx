import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.providerPayout;

export default function ProviderPayoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
