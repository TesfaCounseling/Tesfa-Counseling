import { getBrowserTimezone } from "./format";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5050/api/v1";

export type UserRole = "therapist" | "trainee" | "client";

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_email_verified: boolean;
  account_type?: "therapist" | "trainee" | "client" | null;
  roles: { role: string; organization_id: string }[];
}

export interface AuthResponse {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
}

export interface Provider {
  id: string;
  full_name: string;
  type: "therapist" | "trainee";
  bio?: string | null;
  specializations?: string | null;
  languages?: string | null;
  program_name?: string | null;
}

export interface Slot {
  starts_at: string;
  ends_at: string;
  client_local: string;
  client_timezone: string;
}

export interface Appointment {
  id: string;
  client_id: string;
  provider_id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  client_timezone?: string;
  provider_timezone?: string;
  client_local_display?: string;
  provider_local_display?: string;
  pricing_type: string;
  amount_cents: number;
  currency: string;
  provider_name?: string | null;
  client_name?: string | null;
  video_room_url?: string | null;
  session_mode?: "video" | "audio_only";
  can_join_video?: boolean;
}

export interface ProviderProfile {
  type: "therapist" | "trainee";
  profile_id: string;
  bio?: string | null;
  specializations?: string | null;
  languages?: string | null;
  license_number?: string | null;
  license_authority?: string | null;
  program_name?: string | null;
  approval_status: string;
  supervisor_id?: string | null;
  supervisor_name?: string | null;
  supervisor_email?: string | null;
}

export interface SessionPricing {
  id: string;
  duration_minutes: number;
  pricing_type: string;
  amount_cents: number;
  currency: string;
  is_active: boolean;
}

export interface AvailabilityRule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone: string;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function apiErrorMessage(data: Record<string, unknown>, fallback: string): string {
  const msg = data.message ?? data.error ?? data.msg;
  return typeof msg === "string" && msg.trim() ? msg : fallback;
}

function isAuthFailure(status: number, data: Record<string, unknown>): boolean {
  if (status === 401) return true;
  return status === 422 && typeof data.msg === "string";
}

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshToken}`,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data.access_token !== "string") return null;
    localStorage.setItem("access_token", data.access_token);
    return data.access_token;
  } catch {
    return null;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  auth = false,
  retried = false
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const timeoutMs = 15000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out — is the backend running on port 5050?");
    }
    throw new Error("Cannot reach the API. Start the backend with: cd backend && python run.py");
  } finally {
    clearTimeout(timeoutId);
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    if (auth && !retried && isAuthFailure(res.status, data)) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return apiFetch<T>(path, options, auth, true);
      }
      clearAuthSession();
      throw new Error("Your session expired. Please log in again.");
    }
    throw new Error(apiErrorMessage(data, "Request failed"));
  }
  return data as T;
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function registerUser(payload: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  organization_name?: string;
  languages?: string;
  program_name?: string;
}) {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(email: string, password: string) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function getMe() {
  return apiFetch<{ user: AuthUser }>("/auth/me", {}, true);
}

export interface PendingTherapist {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  bio?: string | null;
  specializations?: string | null;
  languages?: string | null;
  license_number?: string | null;
  license_authority?: string | null;
  organization_name?: string | null;
  approval_status: string;
  created_at: string;
}

export interface PendingTrainee {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  program_name?: string | null;
  languages?: string | null;
  organization_name?: string | null;
  supervisor_id?: string | null;
  approval_status: string;
  created_at: string;
}

export function listPendingTherapists() {
  return apiFetch<{ therapists: PendingTherapist[] }>("/admin/therapists/pending", {}, true);
}

export function approveTherapist(profileId: string) {
  return apiFetch<{ therapist: PendingTherapist }>(
    `/admin/therapists/${profileId}/approve`,
    { method: "POST" },
    true
  );
}

export function rejectTherapist(profileId: string, reason: string) {
  return apiFetch<{ therapist: PendingTherapist }>(
    `/admin/therapists/${profileId}/reject`,
    { method: "POST", body: JSON.stringify({ reason }) },
    true
  );
}

export function listPendingTrainees() {
  return apiFetch<{ trainees: PendingTrainee[] }>("/admin/trainees/pending", {}, true);
}

export function approveTrainee(profileId: string, supervisorId?: string) {
  return apiFetch<{ trainee: PendingTrainee }>(
    `/admin/trainees/${profileId}/approve`,
    { method: "POST", body: JSON.stringify(supervisorId ? { supervisor_id: supervisorId } : {}) },
    true
  );
}

export interface AdminSupervisor {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export function listAdminSupervisors() {
  return apiFetch<{ supervisors: AdminSupervisor[] }>("/admin/supervisors", {}, true);
}

export function rejectTrainee(profileId: string, reason: string) {
  return apiFetch<{ trainee: PendingTrainee }>(
    `/admin/trainees/${profileId}/reject`,
    { method: "POST", body: JSON.stringify({ reason }) },
    true
  );
}

export interface AdminOverview {
  pending_counselors: number;
  pending_trainees: number;
  approved_counselors: number;
  approved_trainees: number;
  total_users: number;
  active_users: number;
  organizations: number;
  audit_events_24h: number;
}

export interface AdminDailyCount {
  date: string;
  count: number;
}

export interface AdminStatistics {
  generated_at: string;
  users: {
    total: number;
    active: number;
    inactive: number;
    new_7d: number;
    new_30d: number;
    clients: number;
    platform_admins: number;
    counselors: { pending: number; approved: number; rejected: number; suspended: number };
    trainees: { pending: number; approved: number; rejected: number; suspended: number };
  };
  organizations: { total: number; active: number; inactive: number };
  appointments: {
    total: number;
    upcoming: number;
    completed: number;
    cancelled: number;
    no_show: number;
    new_7d: number;
    new_30d: number;
    with_video_room: number;
    by_status: Record<string, number>;
    by_pricing_type: Record<string, number>;
  };
  revenue: {
    total_recorded_cents: number;
    completed_cents: number;
    last_30d_cents: number;
    avg_paid_session_cents: number;
    pro_bono_sessions: number;
    sliding_scale_sessions: number;
    by_currency: { currency: string; total_cents: number; sessions: number }[];
  };
  platform: {
    session_pricing_rules: number;
    audit_events_24h: number;
    audit_events_7d: number;
    audit_events_30d: number;
  };
  trends: {
    signups_daily: AdminDailyCount[];
    bookings_daily: AdminDailyCount[];
  };
  top_providers: {
    id: string;
    name: string;
    bookings: number;
    revenue_cents: number;
  }[];
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_email_verified: boolean;
  profile_type: string | null;
  roles: { role: string; organization_id: string; organization_name?: string | null }[];
  created_at: string;
}

export interface AdminProvider {
  profile_id: string;
  user_id: string;
  email: string;
  full_name: string;
  type: "therapist" | "trainee";
  approval_status: string;
  is_active: boolean;
  created_at: string;
  specializations?: string | null;
  languages?: string | null;
  approved_at?: string | null;
  program_name?: string | null;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_label?: string | null;
  details: string | null;
  actor_email: string | null;
  actor_name: string | null;
  created_at: string;
}

export interface AdminOrganization {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  is_active: boolean;
  member_count: number;
  created_at: string;
}

export function getAdminOverview() {
  return apiFetch<AdminOverview>("/admin/overview", {}, true);
}

export function getAdminStatistics() {
  return apiFetch<AdminStatistics>("/admin/statistics", {}, true);
}

export function listAdminUsers(params?: { q?: string; limit?: number; offset?: number }) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.offset) search.set("offset", String(params.offset));
  const q = search.toString();
  return apiFetch<{ users: AdminUser[]; total: number; limit: number; offset: number }>(
    `/admin/users${q ? `?${q}` : ""}`,
    {},
    true
  );
}

export function updateAdminUser(userId: string, payload: { is_active: boolean }) {
  return apiFetch<{ user: AdminUser }>(`/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, true);
}

export const GRANTABLE_ADMIN_ROLES = [
  { value: "supervisor", label: "Supervisor" },
  { value: "platform_admin", label: "Platform admin" },
] as const;

export function grantAdminUserRole(
  userId: string,
  payload: { role: string; organization_id?: string }
) {
  return apiFetch<{ user: AdminUser }>(`/admin/users/${userId}/roles`, {
    method: "POST",
    body: JSON.stringify(payload),
  }, true);
}

export function revokeAdminUserRole(
  userId: string,
  payload: { role: string; organization_id?: string }
) {
  return apiFetch<{ user: AdminUser }>(`/admin/users/${userId}/roles`, {
    method: "DELETE",
    body: JSON.stringify(payload),
  }, true);
}

export function listAdminProviders(status: "all" | "approved" | "pending" | "rejected" = "all") {
  return apiFetch<{ providers: AdminProvider[] }>(`/admin/providers?status=${status}`, {}, true);
}

export function listAuditLogs(params?: { limit?: number; offset?: number }) {
  const search = new URLSearchParams();
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.offset) search.set("offset", String(params.offset));
  const q = search.toString();
  return apiFetch<{ logs: AuditLogEntry[]; total: number; limit: number; offset: number }>(
    `/admin/audit-logs${q ? `?${q}` : ""}`,
    {},
    true
  );
}

export function listAdminOrganizations() {
  return apiFetch<{ organizations: AdminOrganization[] }>("/admin/organizations", {}, true);
}

export function updateAdminOrganization(
  orgId: string,
  payload: { name?: string; timezone?: string; is_active?: boolean }
) {
  return apiFetch<{ organization: AdminOrganization }>(`/admin/organizations/${orgId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, true);
}

export function getHealth() {
  return apiFetch<{ status: string; service: string }>("/health");
}

export function listProviders() {
  return apiFetch<{ providers: Provider[] }>("/therapists");
}

export function getProvider(providerId: string) {
  return apiFetch<{ provider: Provider }>(`/therapists/${providerId}`);
}

export interface ProviderPricing {
  duration_minutes: number;
  pricing_type: string;
  amount_cents: number;
  currency: string;
}

export function getProviderPricing(providerId: string) {
  return apiFetch<{ pricing: ProviderPricing[] }>(`/therapists/${providerId}/pricing`);
}

export function getProviderSlots(providerId: string, durationMinutes = 50, clientTimezone?: string) {
  const tz = clientTimezone || getBrowserTimezone();
  return apiFetch<{ slots: Slot[]; duration_minutes: number }>(
    `/appointments/providers/${providerId}/slots?duration_minutes=${durationMinutes}&client_timezone=${encodeURIComponent(tz)}`,
    {},
    true
  );
}

export function bookAppointment(payload: {
  provider_id: string;
  starts_at: string;
  duration_minutes: number;
  pricing_type?: string;
  amount_cents?: number;
  session_mode?: "video" | "audio_only";
  client_timezone?: string;
}) {
  return apiFetch<{ appointment: Appointment }>(
    "/appointments",
    { method: "POST", body: JSON.stringify({ ...payload, client_timezone: payload.client_timezone || getBrowserTimezone() }) },
    true
  );
}

export function listAppointments(upcoming = true) {
  const q = upcoming ? "?upcoming=true" : "?upcoming=false";
  return apiFetch<{ appointments: Appointment[] }>(`/appointments${q}`, {}, true);
}

export function completeAppointment(id: string) {
  return apiFetch<{ appointment: Appointment }>(`/appointments/${id}/complete`, { method: "POST" }, true);
}

export interface NoteSession {
  appointment_id: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  status: string;
  client_id: string;
  client_name: string | null;
  provider_id: string;
  provider_name: string | null;
  note_id: string | null;
  note_status: string | null;
}

export interface ClinicalNote {
  id: string;
  appointment_id: string;
  author_id: string;
  author_name: string | null;
  client_id: string;
  client_name: string | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  status: string;
  submitted_at: string | null;
  cosigned_by_id: string | null;
  cosigned_by_name: string | null;
  cosigned_at: string | null;
  supervisor_comment: string | null;
  session_at: string | null;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export function listNoteSessions() {
  return apiFetch<{ sessions: NoteSession[] }>("/clinical-notes/sessions", {}, true);
}

export function listSupervisionQueue() {
  return apiFetch<{ notes: ClinicalNote[] }>("/clinical-notes/supervision", {}, true);
}

export interface SupervisionTrainee {
  id: string;
  full_name: string;
  email: string;
  program_name: string | null;
  languages: string | null;
  approval_status: string;
  pending_notes: number;
}

export function getSupervisionOverview() {
  return apiFetch<{
    trainees: SupervisionTrainee[];
    pending_count: number;
    pending_notes: ClinicalNote[];
  }>("/clinical-notes/supervision/overview", {}, true);
}

export function getNoteByAppointment(appointmentId: string) {
  return apiFetch<{ session: NoteSession; note: ClinicalNote | null }>(
    `/clinical-notes/by-appointment/${appointmentId}`,
    {},
    true
  );
}

export function createClinicalNote(payload: {
  appointment_id: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}) {
  return apiFetch<{ note: ClinicalNote }>(
    "/clinical-notes",
    { method: "POST", body: JSON.stringify(payload) },
    true
  );
}

export function updateClinicalNote(
  noteId: string,
  payload: Partial<{ subjective: string; objective: string; assessment: string; plan: string }>
) {
  return apiFetch<{ note: ClinicalNote }>(
    `/clinical-notes/${noteId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    true
  );
}

export function submitClinicalNote(noteId: string) {
  return apiFetch<{ note: ClinicalNote }>(`/clinical-notes/${noteId}/submit`, { method: "POST" }, true);
}

export function cosignClinicalNote(noteId: string, supervisor_comment?: string) {
  return apiFetch<{ note: ClinicalNote }>(
    `/clinical-notes/${noteId}/cosign`,
    { method: "POST", body: JSON.stringify({ supervisor_comment: supervisor_comment || "" }) },
    true
  );
}

export interface TraineeIntakeRecord {
  id: string;
  client_id: string;
  client_name: string | null;
  trainee_provider_id: string;
  trainee_name: string | null;
  presenting_concerns: string;
  primary_goals: string;
  prior_therapy: string | null;
  current_medications: string | null;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  country: string | null;
  preferred_session_mode: "video" | "audio_only";
  supervised_care_consent: boolean;
  telehealth_consent: boolean;
  crisis_acknowledgment: boolean;
  completed_at: string | null;
  created_at: string;
}

export function getTraineeIntakeStatus(traineeProviderId: string) {
  return apiFetch<{ required: boolean; completed: boolean; intake: TraineeIntakeRecord | null }>(
    `/intake/trainee/${traineeProviderId}/status`,
    {},
    true
  );
}

export function submitTraineeIntake(
  traineeProviderId: string,
  payload: {
    presenting_concerns: string;
    primary_goals: string;
    prior_therapy?: string;
    current_medications?: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    country?: string;
    preferred_session_mode: "video" | "audio_only";
    supervised_care_consent: boolean;
    telehealth_consent: boolean;
    crisis_acknowledgment: boolean;
  }
) {
  return apiFetch<{ intake: TraineeIntakeRecord }>(
    `/intake/trainee/${traineeProviderId}`,
    { method: "POST", body: JSON.stringify(payload) },
    true
  );
}

export async function listProviderIntakes() {
  const me = await getMe();
  return apiFetch<{ intakes: TraineeIntakeRecord[] }>(`/intake/trainee/${me.user.id}`, {}, true);
}

export function listSupervisorIntakes() {
  return apiFetch<{ intakes: TraineeIntakeRecord[] }>("/intake/supervision", {}, true);
}

export function cancelAppointment(id: string, reason?: string) {
  return apiFetch<{ appointment: Appointment }>(
    `/appointments/${id}/cancel`,
    { method: "POST", body: JSON.stringify({ reason: reason || "" }) },
    true
  );
}

export function getAppointment(id: string) {
  return apiFetch<{ appointment: Appointment }>(`/appointments/${id}`, {}, true);
}

export function rescheduleAppointment(
  id: string,
  payload: { starts_at: string; duration_minutes?: number }
) {
  return apiFetch<{ appointment: Appointment }>(
    `/appointments/${id}/reschedule`,
    { method: "POST", body: JSON.stringify(payload) },
    true
  );
}

export function getMyProviderProfile() {
  return apiFetch<{ profile: ProviderProfile; user: { full_name: string; email: string } }>(
    "/providers/me",
    {},
    true
  );
}

export function updateMyProviderProfile(payload: Record<string, string | null | undefined>) {
  return apiFetch<{ profile: ProviderProfile }>(
    "/providers/me",
    { method: "PATCH", body: JSON.stringify(payload) },
    true
  );
}

export function listAvailabilityRules() {
  return apiFetch<{ rules: AvailabilityRule[] }>("/availability/rules", {}, true);
}

export function createAvailabilityRule(payload: {
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone?: string;
}) {
  return apiFetch<{ rule: AvailabilityRule }>(
    "/availability/rules",
    { method: "POST", body: JSON.stringify(payload) },
    true
  );
}

export function deleteAvailabilityRule(id: string) {
  return apiFetch<{ ok: boolean }>(`/availability/rules/${id}`, { method: "DELETE" }, true);
}

export function listSessionPricing() {
  return apiFetch<{ pricing: SessionPricing[] }>("/availability/pricing", {}, true);
}

export function upsertPricing(
  duration_minutes: number,
  amount_cents: number,
  pricing_type = "standard",
  currency = "USD"
) {
  return apiFetch<{ pricing: unknown }>(
    "/availability/pricing",
    { method: "POST", body: JSON.stringify({ duration_minutes, amount_cents, pricing_type, currency }) },
    true
  );
}
