"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import PageHero from "@/components/PageHero";
import { ProviderAvatar } from "@/components/ProviderCard";
import {
  deleteMyProviderPhoto,
  getMyProviderProfile,
  updateMyProviderProfile,
  uploadMyProviderPhoto,
  type ProviderProfile,
} from "@/lib/api";
import { resolveProviderPhotoUrl } from "@/lib/providerUtils";

function ProfileChecklist({ profile }: { profile: ProviderProfile }) {
  const approved = profile.approval_status === "approved";
  const hasPhoto = Boolean(profile.photo_url);
  const hasIntro = Boolean(profile.bio?.trim());

  return (
    <div className="rounded-xl bg-ethio-surface p-4 text-sm">
      <p className="font-semibold text-ethio-ink">Public listing checklist</p>
      <p className="mt-1 text-ethio-ink-muted">
        You appear on the homepage and Find a counselor once all items are complete.
      </p>
      <ul className="mt-3 space-y-2 text-ethio-ink-muted">
        <li>{approved ? "✓" : "○"} Admin approval</li>
        <li>{hasPhoto ? "✓" : "○"} Profile photo</li>
        <li>{hasIntro ? "✓" : "○"} Introduction</li>
      </ul>
      {profile.public_profile_complete && (
        <p className="mt-3 font-medium text-ethio-green-dark">Your profile is live on the main page.</p>
      )}
    </div>
  );
}

export default function ProviderProfilePage() {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getMyProviderProfile()
      .then((data) => {
        setProfile(data.profile);
        setFullName(data.user.full_name);
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
      setSuccess(
        result.profile.public_profile_complete
          ? "Profile saved. Your photo and introduction are live on the main page."
          : "Profile saved. Add a photo and introduction to appear on the main page after approval."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoChange(file: File | null) {
    if (!file || !profile) return;
    setUploadingPhoto(true);
    setError("");
    setSuccess("");
    try {
      const result = await uploadMyProviderPhoto(file);
      setProfile(result.profile);
      setSuccess(
        result.profile.public_profile_complete
          ? "Photo uploaded. Your profile is live on the main page."
          : "Photo uploaded. Add your introduction to appear on the main page after approval."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemovePhoto() {
    if (!profile?.photo_url) return;
    setUploadingPhoto(true);
    setError("");
    setSuccess("");
    try {
      const result = await deleteMyProviderPhoto();
      setProfile(result.profile);
      setSuccess("Photo removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove photo");
    } finally {
      setUploadingPhoto(false);
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
        <PageHero title="Provider profile" subtitle="This page is for counselors only." backHref="/dashboard" backLabel="Dashboard" />
      </div>
    );
  }

  const photoPreview = resolveProviderPhotoUrl(profile.photo_url);

  return (
    <div className="page-shell">
      <SiteHeader showAuth={false} />
      <PageHero
        eyebrow="Your practice"
        title="Edit profile"
        subtitle="Upload your photo and write a short introduction. Once approved, you appear automatically on the main page."
        backHref="/dashboard"
        backLabel="Dashboard"
      />
      <main className="mx-auto max-w-5xl page-pad pb-12 pt-2">
        <form onSubmit={handleSubmit} className="card-vibrant space-y-5 p-6">
          <p className="text-sm text-ethio-ink-muted">
            Signed in as <strong className="text-ethio-ink">{email}</strong> · Status:{" "}
            <span className="capitalize">{profile.approval_status}</span>
          </p>

          {profile.type === "therapist" && <ProfileChecklist profile={profile} />}

          {profile.type === "therapist" && (
            <div className="rounded-xl border border-ethio-border p-4">
              <p className="text-sm font-semibold text-ethio-ink">Profile photo</p>
              <p className="mt-1 text-xs text-ethio-ink-muted">
                JPEG, PNG, or WebP · max 2 MB. Shown on the homepage and counselor listings.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <ProviderAvatar name={fullName} photoUrl={profile.photo_url} size="lg" />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="btn-secondary text-sm disabled:opacity-60"
                  >
                    {uploadingPhoto ? "Uploading…" : photoPreview ? "Change photo" : "Upload photo"}
                  </button>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={uploadingPhoto}
                      className="rounded-lg border border-ethio-border px-4 py-2 text-sm font-semibold text-ethio-ink-muted disabled:opacity-60"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)}
                />
              </div>
            </div>
          )}

          <label className="block text-sm font-medium text-ethio-ink">
            Languages (comma-separated)
            <input name="languages" defaultValue={profile.languages || ""} required className="input-field" />
          </label>

          {profile.type === "therapist" ? (
            <>
              <label className="block text-sm font-medium text-ethio-ink">
                Introduction
                <textarea
                  name="bio"
                  rows={5}
                  required
                  defaultValue={profile.bio || ""}
                  placeholder="A brief welcome for clients — your approach, who you help, and what sessions feel like."
                  className="input-field"
                />
                <span className="mt-1 block text-xs font-normal text-ethio-ink-muted">
                  This appears on the main page and your public counselor profile.
                </span>
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
