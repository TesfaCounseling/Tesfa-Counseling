"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import AuthShell from "@/components/AuthShell";
import { loginUser } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const safeNext = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    try {
      const result = await loginUser(String(form.get("email")), String(form.get("password")));
      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("refresh_token", result.refresh_token);
      router.push(safeNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Log in"
      subtitle={safeNext === "/admin" ? "Sign in with your admin account to continue" : "Access your sessions and messages"}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input-field"
          />
        </label>

        {error && (
          <p className="alert-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-center text-sm text-ethio-ink-muted">
          New here?{" "}
          <a href="/register" className="link-inline">
            Create account
          </a>
        </p>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthShell title="Log in" subtitle="Loading…" />}>
      <LoginForm />
    </Suspense>
  );
}
