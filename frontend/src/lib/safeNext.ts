/** Same-site relative ?next= paths: one leading '/', not '//' or a full URL. */
export function isSafeNextPath(value: string | null | undefined): value is string {
  if (!value) return false;
  if (/[\\\n\r\t]/.test(value)) return false;
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  if (value.includes("://")) return false;
  return true;
}

/** After login/register: honor a safe next path, else the role dashboard at /dashboard. */
export function postLoginPath(
  nextParam: string | null | undefined,
  user?: { account_type?: string | null } | null
): string {
  if (isSafeNextPath(nextParam)) return nextParam;
  if (user?.account_type === "therapist" || user?.account_type === "trainee") {
    return "/dashboard";
  }
  return "/dashboard";
}
