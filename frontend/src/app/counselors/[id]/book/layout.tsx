import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

type BookLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: BookLayoutProps): Promise<Metadata> {
  const { id } = await params;
  const slug = encodeURIComponent(id);
  return pageMetadata(
    "Book a session",
    "Choose a time in your timezone and book a secure online counseling session with Tesfa Counseling.",
    `/counselors/${slug}/book`
  );
}

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
