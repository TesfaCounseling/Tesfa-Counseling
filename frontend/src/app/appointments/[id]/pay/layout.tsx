import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.pay;

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
