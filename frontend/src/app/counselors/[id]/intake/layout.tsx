import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.intake;

export default function IntakeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
