import type { AuthUser } from "./api";

export function hasRole(user: AuthUser | null, ...roles: string[]): boolean {
  if (!user) return false;
  return user.roles.some((r) => roles.includes(r.role));
}

export function canReviewCounselors(user: AuthUser | null): boolean {
  return hasRole(user, "platform_admin");
}

export function canReviewTrainees(user: AuthUser | null): boolean {
  return hasRole(user, "platform_admin", "supervisor");
}

export function hasAdminAccess(user: AuthUser | null): boolean {
  return canReviewCounselors(user) || canReviewTrainees(user);
}

export function canManagePlatform(user: AuthUser | null): boolean {
  return hasRole(user, "platform_admin");
}

export function isSupervisor(user: AuthUser | null): boolean {
  return hasRole(user, "supervisor");
}

export function isCounselorProvider(user: AuthUser | null): boolean {
  return user?.account_type === "therapist" || user?.account_type === "trainee";
}

export function hasCounselorAndSupervisorRoles(user: AuthUser | null): boolean {
  return isCounselorProvider(user) && isSupervisor(user);
}
