import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.reset;

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
