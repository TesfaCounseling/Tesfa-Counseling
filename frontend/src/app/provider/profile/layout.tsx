import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.providerProfile;

export default function ProviderProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
