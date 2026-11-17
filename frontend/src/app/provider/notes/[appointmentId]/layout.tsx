import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/seo";

export const metadata: Metadata = PAGE_SEO.providerNoteEditor;

export default function ProviderNoteEditorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
