import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_NAME, TAGLINE } from "@/lib/brand";

export const metadata: Metadata = {
  title: APP_NAME,
  description:
    "Virtual counseling for Ethiopians and Ethiopian families in the diaspora — culturally informed, compassionate care online.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#078930",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
