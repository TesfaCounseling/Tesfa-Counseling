"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import AuthShell from "@/components/AuthShell";
import { registerUser, type UserRole } from "@/lib/api";

const ROLE_COPY: Record<
  UserRole,
  { title: string; subtitle: string; submitLabel: string }
> = {
  client: {
    title: "Find a counselor",
    subtitle: "Create a client account to browse counselors and book sessions",
    submitLabel: "Create client account",
  },
  therapist: {
    title: "Join as a counselor",
    subtitle: "Apply to offer counseling services on the platform",
    submitLabel: "Apply as counselor",
  },
  trainee: {
    title: "Join as a trainee",
    subtitle: "Register as a counseling trainee under supervision",
    submitLabel: "Apply as trainee",
  },
};

type RegisterFormProps = {
  defaultRole: UserRole;
  lockRole?: boolean;
};

export default function RegisterForm({ defaultRole, lockRole = false }: RegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role") as UserRole | null;
  const resolvedDefault =
    roleParam && ["client", "therapist", "trainee"].includes(roleParam) ? roleParam : defaultRole;

  const [role, setRole] = useState<UserRole>(resolvedDefault);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRole(resolvedDefault);
  }, [resolvedDefault]);

  const copy = ROLE_COPY[role];

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    try {
      const payload: Parameters<typeof registerUser>[0] = {
        email: String(form.get("email")),
        password: String(form.get("password")),
        first_name: String(form.get("first_name")),
        last_name: String(form.get("last_name")),
        role,
      };
      if (role !== "client") {
        payload.organization_name = String(form.get("organization_name") || "");
        payload.languages = String(form.get("languages") || "").trim();
      }
      if (role === "trainee") {
        payload.program_name = String(form.get("program_name") || "").trim();
      }
      const result = await registerUser(payload);
      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("refresh_token", result.refresh_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={copy.title} subtitle={copy.subtitle}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {!lockRole ? (
          <label className="block text-sm font-medium text-ethio-ink">
            I am a
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="input-field"
            >
              <option value="client">Client seeking counseling</option>
              <option value="therapist">Licensed counselor</option>
              <option value="trainee">Counseling trainee</option>
            </select>
          </label>
        ) : (
          <p className="alert-success font-medium">
            Registering as:{" "}
            {role === "client"
              ? "Client"
              : role === "therapist"
                ? "Licensed counselor"
                : "Counseling trainee"}
          </p>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ethio-ink">
            First name
            <input name="first_name" autoComplete="given-name" required className="input-field" />
          </label>
          <label className="block text-sm font-medium text-ethio-ink">
            Last name
            <input name="last_name" autoComplete="family-name" required className="input-field" />
          </label>
        </div>

        <label className="block text-sm font-medium text-ethio-ink">
          Email
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            className="input-field"
          />
        </label>

        <label className="block text-sm font-medium text-ethio-ink">
          Password (min 8 characters)
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="input-field"
          />
        </label>

        {(role === "therapist" || role === "trainee") && (
          <>
            <label className="block text-sm font-medium text-ethio-ink">
              Languages you offer sessions in
              <input
                name="languages"
                required
                placeholder="e.g. English, Spanish, Amharic"
                className="input-field"
              />
              <span className="mt-1 block text-xs font-normal text-ethio-ink-muted">
                Separate multiple languages with commas. These appear in the Find a counselor filter.
              </span>
            </label>
            <label className="block text-sm font-medium text-ethio-ink">
              Organization / clinic name
              <input name="organization_name" autoComplete="organization" className="input-field" />
            </label>
            {role === "trainee" && (
              <label className="block text-sm font-medium text-ethio-ink">
                Training program
                <input name="program_name" placeholder="e.g. MA Counseling — State University" className="input-field" />
              </label>
            )}
          </>
        )}

        {error && (
          <p className="alert-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Please wait…" : copy.submitLabel}
        </button>

        <p className="text-center text-sm text-ethio-ink-muted">
          Already have an account?{" "}
          <a href="/login" className="link-inline">
            Log in
          </a>
        </p>

        {lockRole && (
          <p className="text-center text-sm text-ethio-ink-muted">
            {role === "client" && (
              <>
                Are you a counselor or trainee?{" "}
                <a href="/register/counselor" className="link-inline">
                  Counselor
                </a>
                {" · "}
                <a href="/register/trainee" className="link-inline">
                  Trainee
                </a>
              </>
            )}
            {role === "therapist" && (
              <>
                In training under supervision?{" "}
                <a href="/register/trainee" className="link-inline">
                  Apply as trainee
                </a>
                {" · "}
                <a href="/register/client" className="link-inline">
                  Need counseling?
                </a>
              </>
            )}
            {role === "trainee" && (
              <>
                Already licensed?{" "}
                <a href="/register/counselor" className="link-inline">
                  Apply as counselor
                </a>
                {" · "}
                <a href="/register/client" className="link-inline">
                  Need counseling?
                </a>
              </>
            )}
          </p>
        )}
      </form>
    </AuthShell>
  );
}
