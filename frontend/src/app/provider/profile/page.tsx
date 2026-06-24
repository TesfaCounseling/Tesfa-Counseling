"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import PageHero from "@/components/PageHero";
import { getMyProviderProfile, updateMyProviderProfile, type ProviderProfile } from "@/lib/api";

export default function ProviderProfilePage() {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    getMyProviderProfile()
      .then((data) => {
        setProfile(data.profile);
        setEmail(data.user.email);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError("");
    setSuccess("");
    const form = new FormData(e.currentTarget);
    try {
      const payload: Record<string, string> = {
        languages: String(form.get("languages") || "").trim(),
      };
      if (profile.type === "therapist") {
        payload.bio = String(form.get("bio") || "").trim();
        payload.specializations = String(form.get("specializations") || "").trim();
        payload.license_number = String(form.get("license_number") || "").trim();
        payload.license_authority = String(form.get("license_authority") || "").trim();
      } else {
        payload.program_name = String(form.get("program_name") || "").trim();
      }
      const result = await updateMyProviderProfile(payload);
      setProfile(result.profile);
      setSuccess("Profile saved. Changes appear on Find a counselor after approval.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <SiteHeader showAuth={false} />
        <main className="mx-auto max-w-5xl page-pad py-16 text-center text-ethio-ink-muted">Loading profile…</main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-shell">
        <SiteHeader showAuth={false} />
        <PageHero title="Provider profile" subtitle="This page is for counselors and trainees only." backHref="/dashboard" backLabel="Dashboard" />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <SiteHeader showAuth={false} />
      <PageHero
        eyebrow="Your practice"
        title="Edit profile"
        subtitle="Update how clients find and learn about you on the platform."
        backHref="/dashboard"
        backLabel="Dashboard"
      />
      <main className="mx-auto max-w-5xl page-pad pb-12 pt-2">
        <form onSubmit={handleSubmit} className="card-vibrant space-y-5 p-6">
          <p className="text-sm text-ethio-ink-muted">
            Signed in as <strong className="text-ethio-ink">{email}</strong> · Status:{" "}
            <span className="capitalize">{profile.approval_status}</span>
          </p>

          <label className="block text-sm font-medium text-ethio-ink">
            Languages (comma-separated)
            <input name="languages" defaultValue={profile.languages || ""} required className="input-field" />
          </label>

          {profile.type === "therapist" ? (
            <>
              <label className="block text-sm font-medium text-ethio-ink">
                Bio
                <textarea name="bio" rows={4} defaultValue={profile.bio || ""} className="input-field" />
              </label>
              <label className="block text-sm font-medium text-ethio-ink">
                Specialties (comma-separated)
                <input name="specializations" defaultValue={profile.specializations || ""} className="input-field" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-ethio-ink">
                  License number
                  <input name="license_number" defaultValue={profile.license_number || ""} className="input-field" />
                </label>
                <label className="block text-sm font-medium text-ethio-ink">
                  License authority
                  <input name="license_authority" defaultValue={profile.license_authority || ""} className="input-field" />
                </label>
              </div>
            </>
          ) : (
            <label className="block text-sm font-medium text-ethio-ink">
              Training program
              <input name="program_name" defaultValue={profile.program_name || ""} className="input-field" />
            </label>
          )}

          {error && <p className="alert-error">{error}</p>}
          {success && <p className="alert-success">{success}</p>}

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-60">
              {saving ? "Saving…" : "Save profile"}
            </button>
            <Link href="/provider/schedule" className="rounded-lg border border-ethio-border px-4 py-2 text-sm font-semibold text-ethio-ink-muted">
              Manage schedule
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
