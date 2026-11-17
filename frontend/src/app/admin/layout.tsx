import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.admin;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
