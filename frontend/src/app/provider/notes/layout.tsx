import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.providerNotes;

export default function ProviderNotesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
