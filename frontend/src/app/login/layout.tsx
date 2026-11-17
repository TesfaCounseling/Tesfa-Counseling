import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.login;

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
