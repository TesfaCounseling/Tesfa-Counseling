import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.registerClient;

export default function ClientRegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
