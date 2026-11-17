import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.account;

export default function AccountSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
