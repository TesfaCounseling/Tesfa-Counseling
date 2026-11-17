import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.supervisionIntakes;

export default function SupervisionIntakesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
