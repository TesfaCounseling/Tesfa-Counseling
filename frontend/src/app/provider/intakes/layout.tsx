import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.providerIntakes;

export default function ProviderIntakesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
