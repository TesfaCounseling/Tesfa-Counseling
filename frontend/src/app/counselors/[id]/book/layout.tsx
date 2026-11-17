import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.book;

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
