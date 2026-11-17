import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.schedule;

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
