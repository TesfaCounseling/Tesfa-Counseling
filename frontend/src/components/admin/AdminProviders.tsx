"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listAdminProviders, type AdminProvider } from "@/lib/api";
import { formatDateTime, formatStatusLabel } from "@/lib/format";

const STATUS_OPTIONS = ["all", "approved", "pending", "rejected"] as const;

export default function AdminProviders() {
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listAdminProviders(status)
      .then((data) => setProviders(data.providers))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load providers"))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStatus(option)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize ${
              status === option ? "bg-ethio-surface text-ethio-green-dark" : "text-ethio-ink-muted"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 alert-error">{error}</p>}
      {loading && <p className="text-sm text-ethio-ink-muted">Loading providers…</p>}

      {!loading && providers.length === 0 && (
        <div className="card-vibrant p-8 text-center">
          <p className="font-semibold text-ethio-ink">No providers found</p>
          <p className="mt-2 text-sm text-ethio-ink-muted">Try a different status filter.</p>
        </div>
      )}

      <div className="space-y-3">
        {providers.map((provider) => (
          <article key={provider.profile_id} className="card-vibrant p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-ethio-ink">{provider.full_name}</h3>
                <p className="text-sm text-ethio-ink-muted">{provider.email}</p>
                <p className="mt-1 text-xs text-ethio-ink-muted">
                  {provider.type === "therapist" ? "Counselor" : "Trainee"} · Joined {formatDateTime(provider.created_at)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill label={formatStatusLabel(provider.approval_status)} tone={provider.approval_status} />
                {!provider.is_active && <StatusPill label="Account disabled" tone="rejected" />}
              </div>
            </div>
            {provider.type === "therapist" && provider.specializations && (
              <p className="mt-3 text-sm text-ethio-ink-muted">{provider.specializations}</p>
            )}
            {provider.type === "trainee" && provider.program_name && (
              <p className="mt-3 text-sm text-ethio-ink-muted">Program: {provider.program_name}</p>
            )}
            {provider.approval_status === "approved" && provider.user_id && (
              <Link href={`/counselors/${provider.user_id}/book`} className="link-inline mt-3 inline-block text-sm">
                View public booking page →
              </Link>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: string }) {
  const colors =
    tone === "approved"
      ? "bg-green-100 text-green-800"
      : tone === "pending"
        ? "bg-amber-100 text-amber-800"
        : tone === "rejected"
          ? "bg-red-100 text-red-800"
          : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors}`}>{label}</span>;
}
