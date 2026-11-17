import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.dashboard;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
