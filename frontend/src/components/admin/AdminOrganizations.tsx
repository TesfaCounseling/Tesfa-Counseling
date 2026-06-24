"use client";

import { useEffect, useState } from "react";
import { listAdminOrganizations, updateAdminOrganization, type AdminOrganization } from "@/lib/api";

export default function AdminOrganizations() {
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTimezone, setEditTimezone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    listAdminOrganizations()
      .then((data) => setOrganizations(data.organizations))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load organizations"))
      .finally(() => setLoading(false));
  }, []);

  function startEdit(org: AdminOrganization) {
    setEditingId(org.id);
    setEditName(org.name);
    setEditTimezone(org.timezone);
    setError("");
  }

  async function saveEdit(orgId: string) {
    setSavingId(orgId);
    setError("");
    try {
      const result = await updateAdminOrganization(orgId, {
        name: editName.trim(),
        timezone: editTimezone.trim(),
      });
      setOrganizations((prev) => prev.map((o) => (o.id === orgId ? result.organization : o)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      {error && <p className="mb-4 alert-error">{error}</p>}
      {loading && <p className="text-sm text-ethio-ink-muted">Loading organizations…</p>}

      <div className="space-y-3">
        {organizations.map((org) => (
          <article key={org.id} className="card-vibrant p-4">
            {editingId === org.id ? (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-ethio-ink">
                  Name
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-ethio-border px-3 py-2 text-sm font-normal"
                  />
                </label>
                <label className="block text-sm font-semibold text-ethio-ink">
                  Timezone
                  <input
                    value={editTimezone}
                    onChange={(e) => setEditTimezone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-ethio-border px-3 py-2 text-sm font-normal"
                    placeholder="UTC"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => saveEdit(org.id)}
                    disabled={savingId === org.id}
                    className="btn-primary text-sm disabled:opacity-60"
                  >
                    {savingId === org.id ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-ethio-border px-4 py-2 text-sm font-semibold text-ethio-ink-muted"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-ethio-ink">{org.name}</h3>
                    <p className="text-sm text-ethio-ink-muted">Slug: {org.slug}</p>
                    <p className="mt-1 text-sm text-ethio-ink-muted">
                      Timezone: {org.timezone} · {org.member_count} member{org.member_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      org.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {org.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(org)}
                  className="mt-3 text-sm font-semibold text-ethio-green-dark"
                >
                  Edit settings
                </button>
              </>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
