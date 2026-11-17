import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.registerCounselor;

export default function CounselorRegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
