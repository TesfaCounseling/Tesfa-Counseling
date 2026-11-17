import type { Metadata } from "next";
import { APP_NAME } from "@/lib/brand";

export const SITE_URL = "https://www.tesfacounseling.com";

export const DEFAULT_DESCRIPTION =
  "Virtual counseling for Ethiopians and Ethiopian families in the diaspora — culturally informed, compassionate care online.";

export function pageMetadata(title: string, description: string): Metadata {
  const fullTitle = title.includes(APP_NAME) ? title : `${title} · ${APP_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: SITE_URL },
    openGraph: {
      title: fullTitle,
      description,
      url: SITE_URL,
      siteName: APP_NAME,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: fullTitle,
      description,
    },
  };
}

export const PAGE_SEO = {
  home: pageMetadata(
    "Virtual counseling for the Ethiopian diaspora",
    DEFAULT_DESCRIPTION
  ),
  counselors: pageMetadata(
    "Find a counselor",
    "Browse culturally informed counselors serving the Ethiopian diaspora. Filter by language and book a secure online session."
  ),
  book: pageMetadata(
    "Book a session",
    "Choose a time in your timezone and book a secure online counseling session with Tesfa Counseling."
  ),
  intake: pageMetadata(
    "Trainee intake",
    "Complete intake questions before your first session with a supervised Tesfa Counseling trainee."
  ),
  pay: pageMetadata(
    "Pay for your session",
    "Send remittance for your Tesfa Counseling session and upload your receipt for verification."
  ),
  login: pageMetadata("Log in", "Sign in to Tesfa Counseling to manage sessions, payments, and your care team."),
  register: pageMetadata("Get started", "Create a Tesfa Counseling client or counselor account."),
  registerClient: pageMetadata(
    "Create a client account",
    "Sign up as a client to browse counselors, choose your timezone, and book online sessions."
  ),
  registerCounselor: pageMetadata(
    "Join as a counselor",
    "Apply to offer culturally informed counseling on Tesfa Counseling. Confirm your practice timezone when you register."
  ),
  forgot: pageMetadata("Forgot password", "Request a Tesfa Counseling password reset email."),
  reset: pageMetadata("Reset password", "Choose a new password for your Tesfa Counseling account."),
  dashboard: pageMetadata("Dashboard", "Your Tesfa Counseling dashboard — sessions, payments, and account tools."),
  schedule: pageMetadata("Schedule a session", "Book a follow-up session or manage upcoming Tesfa Counseling appointments."),
  account: pageMetadata("Account settings", "Update your timezone and language so session times display correctly."),
  providerProfile: pageMetadata("Edit counselor profile", "Update your public counselor profile, title, and location."),
  providerSchedule: pageMetadata("Counselor schedule", "Set weekly availability and session pricing for Tesfa Counseling."),
  providerPayout: pageMetadata(
    "Payout settings",
    "Add bank and payout details and the remittance methods you can receive: Remitly, TapTap Send, Wise, Western Union, and CBE."
  ),
  providerNotes: pageMetadata("Session notes", "Write and review SOAP notes for Tesfa Counseling sessions."),
  providerNoteEditor: pageMetadata("Session note", "Document a counseling session with Subjective, Objective, Assessment, and Plan."),
  providerIntakes: pageMetadata("Client intakes", "Review intake forms submitted before trainee sessions."),
  supervision: pageMetadata("Supervision cosign queue", "Review and cosign trainee session notes."),
  supervisionIntakes: pageMetadata("Supervision intakes", "Review client intake forms for assigned trainees."),
  admin: pageMetadata("Admin", "Tesfa Counseling administration dashboard."),
} as const;
