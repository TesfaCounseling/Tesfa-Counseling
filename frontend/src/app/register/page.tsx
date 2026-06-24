import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

const options = [
  {
    href: "/register/client",
    title: "Find a counselor",
    desc: "I need counseling support",
    cta: "Sign up as client",
    tone: "btn-primary",
  },
  {
    href: "/register/counselor",
    title: "Join as a counselor",
    desc: "I'm a licensed counselor offering services",
    cta: "Apply as counselor",
    tone: "btn-secondary",
  },
  {
    href: "/register/trainee",
    title: "Join as a supervised trainee",
    desc: "I'm in training and work under a supervisor",
    cta: "Apply as trainee",
    tone: "btn-trainee",
  },
];

export default function RegisterChooserPage() {
  return (
    <div className="page-shell">
      <div className="ethio-stripe-bar" />
      <main className="mx-auto flex min-h-[80dvh] max-w-lg flex-col justify-center page-pad py-10">
        <Link href="/" className="mb-8 inline-flex min-h-[44px] items-center text-sm font-semibold text-ethio-green-dark">
          ← Back to home
        </Link>
        <h1 className="text-2xl font-extrabold text-ethio-ink sm:text-3xl">Get started</h1>
        <p className="mt-2 text-base text-ethio-ink-muted">Choose how you want to join {APP_NAME}</p>

        <div className="mt-8 space-y-4">
          {options.map((option) => (
            <Link
              key={option.href}
              href={option.href}
              className="card-vibrant block p-5 transition active:scale-[0.99] sm:p-6"
            >
              <h2 className="text-lg font-bold text-ethio-ink">{option.title}</h2>
              <p className="mt-1 text-sm text-ethio-ink-muted">{option.desc}</p>
              <div className={`mt-4 ${option.tone}`}>{option.cta}</div>
            </Link>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-ethio-ink-muted">
          Already registered?{" "}
          <Link href="/login" className="link-inline">
            Log in
          </Link>
        </p>
      </main>
    </div>
  );
}
