import type { FeedbackPageLocation } from "./feedbackPageContext";

const PATH_SCREEN_LABELS: Record<string, string> = {
  "/": "Homepage",
  "/dashboard": "Dashboard",
  "/login": "Log in",
  "/register": "Register",
  "/register/client": "Register — Client",
  "/register/counselor": "Register — Counselor",
  "/register/trainee": "Register — Trainee",
  "/counselors": "Find a counselor",
  "/admin": "Admin",
  "/provider/profile": "Counselor — Edit profile",
  "/provider/schedule": "Counselor — Manage schedule",
  "/provider/notes": "Counselor — Session notes",
  "/provider/intakes": "Counselor — Intakes",
  "/supervision": "Supervision",
  "/supervision/intakes": "Supervision — Intakes",
};

const ADMIN_SECTION_LABELS: Record<string, string> = {
  overview: "Overview",
  statistics: "Statistics",
  approvals: "Approvals",
  providers: "Providers",
  users: "Users",
  feedback: "Client feedback",
  testing: "Testing feedback inbox",
  audit: "Activity log",
};

export function pathnameScreenLabel(pathname: string): string {
  if (PATH_SCREEN_LABELS[pathname]) {
    return PATH_SCREEN_LABELS[pathname];
  }
  if (pathname.startsWith("/counselors/") && pathname.endsWith("/book")) {
    return "Book a session";
  }
  if (pathname.startsWith("/counselors/") && pathname.endsWith("/intake")) {
    return "Client intake form";
  }
  if (pathname.startsWith("/counselors/")) {
    return "Counselor profile";
  }
  if (pathname.startsWith("/provider/notes/")) {
    return "Counselor — Session note";
  }
  return pathname;
}

/** Read visible active tab labels from the page (dashboard tabs, admin tabs, etc.) */
export function captureActiveTabsFromDom(): string[] {
  if (typeof document === "undefined") return [];

  const labels: string[] = [];

  const tabBars = document.querySelectorAll(
    '[data-feedback-tabs="true"], .mb-6.flex.flex-wrap.gap-2.rounded-2xl, .mb-6.flex.flex-wrap.gap-2.border-b'
  );

  tabBars.forEach((bar) => {
    bar.querySelectorAll("button").forEach((btn) => {
      const className = btn.className;
      const isActive =
        className.includes("bg-ethio-green") && className.includes("text-white") ||
        className.includes("bg-white") && className.includes("text-ethio-green-dark");
      if (!isActive) return;
      const text = btn.textContent?.replace(/\s*\d+\+?\s*$/, "").trim();
      if (text && text.length < 50) labels.push(text);
    });
  });

  return [...new Set(labels)];
}

export function formatPageContext(
  pathname: string,
  location: FeedbackPageLocation | null,
  domTabs: string[] = []
): string {
  const parts: string[] = [];

  if (location?.screen) {
    parts.push(location.screen);
  } else {
    parts.push(pathnameScreenLabel(pathname));
  }

  if (location?.tab) {
    parts.push(location.tab);
  } else {
    for (const tab of domTabs) {
      if (!parts.includes(tab)) parts.push(tab);
    }
  }

  if (location?.section) {
    parts.push(location.section);
  }

  return parts.filter(Boolean).join(" › ");
}

export function adminSectionLabel(sectionId: string): string {
  return ADMIN_SECTION_LABELS[sectionId] ?? sectionId;
}
