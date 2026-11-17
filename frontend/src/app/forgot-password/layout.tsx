import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.forgot;

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
