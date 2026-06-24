"use client";

import { useEffect, useState } from "react";
import {
  GRANTABLE_ADMIN_ROLES,
  grantAdminUserRole,
  listAdminUsers,
  revokeAdminUserRole,
  updateAdminUser,
  type AdminUser,
} from "@/lib/api";
import { formatDateTime, formatStatusLabel } from "@/lib/format";

const STAFF_ROLE_SET = new Set(GRANTABLE_ADMIN_ROLES.map((r) => r.value));

function roleLabel(role: string) {
  return GRANTABLE_ADMIN_ROLES.find((r) => r.value === role)?.label || formatStatusLabel(role);
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [grantForUser, setGrantForUser] = useState<string | null>(null);
  const [grantRole, setGrantRole] = useState("supervisor");

  useEffect(() => {
    setLoading(true);
    listAdminUsers({ q: query || undefined, limit: 50 })
      .then((usersData) => {
        setUsers(usersData.users);
        setTotal(usersData.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load users"))
      .finally(() => setLoading(false));
  }, [query]);

  function updateUserInList(updated: AdminUser) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  async function toggleActive(user: AdminUser) {
    setActionId(user.id);
    setError("");
    try {
      const result = await updateAdminUser(user.id, { is_active: !user.is_active });
      updateUserInList(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActionId(null);
    }
  }

  async function handleGrant(userId: string) {
    setActionId(userId);
    setError("");
    try {
      const result = await grantAdminUserRole(userId, { role: grantRole });
      updateUserInList(result.user);
      setGrantForUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not grant role");
    } finally {
      setActionId(null);
    }
  }

  async function handleRevoke(user: AdminUser, role: string) {
    setActionId(`${user.id}:${role}`);
    setError("");
    try {
      const result = await revokeAdminUserRole(user.id, { role });
      updateUserInList(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove role");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm text-ethio-ink-muted">
        Search for a user by name or email, then grant a staff role.
      </p>

      <form
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
        }}
      >
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search counselor by name or email (e.g. counselor@demo.local)…"
          className="min-w-[220px] flex-1 rounded-lg border border-ethio-border px-3 py-2 text-sm"
        />
        <button type="submit" className="btn-primary text-sm">
          Search
        </button>
      </form>

      {error && <p className="mb-4 alert-error">{error}</p>}
      {loading && <p className="text-sm text-ethio-ink-muted">Loading users…</p>}

      {!loading && (
        <p className="mb-3 text-sm text-ethio-ink-muted">
          Showing {users.length} of {total} users
        </p>
      )}

      <div className="space-y-3">
        {users.map((user) => {
          const staffRoles = user.roles.filter((r) => STAFF_ROLE_SET.has(r.role));
          const otherRoles = user.roles.filter((r) => !STAFF_ROLE_SET.has(r.role));

          return (
            <article key={user.id} className="card-vibrant p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-ethio-ink">{user.full_name}</h3>
                  <p className="text-sm text-ethio-ink-muted">{user.email}</p>
                  <p className="mt-1 text-xs text-ethio-ink-muted">
                    Joined {formatDateTime(user.created_at)}
                    {user.profile_type && ` · ${formatStatusLabel(user.profile_type)}`}
                  </p>

                  {otherRoles.length > 0 && (
                    <p className="mt-2 text-xs text-ethio-ink-muted">
                      Account roles:{" "}
                      {otherRoles
                        .map(
                          (r) =>
                            `${formatStatusLabel(r.role)}${
                              r.organization_name ? ` (${r.organization_name})` : ""
                            }`
                        )
                        .join(", ")}
                    </p>
                  )}

                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ethio-ink-muted">
                      Staff roles
                    </p>
                    {staffRoles.length === 0 ? (
                      <p className="mt-1 text-sm text-ethio-ink-muted">No supervisor or admin roles assigned.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {staffRoles.map((r) => (
                          <li
                            key={`${r.role}-${r.organization_id}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ethio-surface px-3 py-2 text-sm"
                          >
                            <span>
                              <span className="font-semibold text-ethio-ink">{roleLabel(r.role)}</span>
                              {r.organization_name && (
                                <span className="text-ethio-ink-muted"> · {r.organization_name}</span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRevoke(user, r.role)}
                              disabled={actionId === `${user.id}:${r.role}`}
                              className="text-xs font-semibold text-ethio-red disabled:opacity-60"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {grantForUser === user.id ? (
                    <div className="mt-4 rounded-xl border border-ethio-border bg-white p-3">
                      <p className="text-sm font-semibold text-ethio-ink">
                        Grant role to {user.full_name}
                      </p>
                      <p className="text-xs text-ethio-ink-muted">{user.email}</p>
                      <label className="mt-3 block text-xs font-medium text-ethio-ink">
                        Role to add
                        <select
                          value={grantRole}
                          onChange={(e) => setGrantRole(e.target.value)}
                          className="input-field mt-1"
                        >
                          {GRANTABLE_ADMIN_ROLES.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      {grantRole === "platform_admin" && (
                        <p className="mt-2 text-xs text-ethio-ink-muted">
                          Platform admin access is granted on the Platform organization automatically.
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleGrant(user.id)}
                          disabled={actionId === user.id}
                          className="btn-primary text-sm"
                        >
                          {actionId === user.id ? "Saving…" : "Grant role"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setGrantForUser(null)}
                          className="btn-secondary text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setGrantForUser(user.id);
                        setGrantRole("supervisor");
                      }}
                      className="mt-3 text-sm font-semibold text-ethio-green-dark"
                    >
                      + Grant role
                    </button>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {user.is_active ? "Active" : "Disabled"}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleActive(user)}
                    disabled={actionId === user.id}
                    className="text-sm font-semibold text-ethio-green-dark disabled:opacity-60"
                  >
                    {actionId === user.id ? "Saving…" : user.is_active ? "Disable account" : "Enable account"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
