import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.supervision;

export default function SupervisionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
