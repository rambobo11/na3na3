/** Map raw provider messages to short, non-leaky copy. */
export function friendlyAuthError(raw: string | null | undefined): string {
  if (!raw) return "Something went wrong. Try again.";
  const m = raw.toLowerCase();

  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "Wrong email or password.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirm your email first (check inbox), or disable confirm-email in Supabase.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "Account exists — use Sign in, or the same password on both devices.";
  }
  if (m.includes("password") && (m.includes("least") || m.includes("weak") || m.includes("short"))) {
    return "Password must be at least 6 characters.";
  }
  if (m.includes("rate") || m.includes("security") || m.includes("too many")) {
    return "Too many attempts. Wait a bit and try again.";
  }
  if (m.includes("invalid") && m.includes("email")) {
    return "That email looks invalid.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Network issue. Check your connection.";
  }
  if (m.includes("not configured")) {
    return "Sync is not configured yet.";
  }

  return "Couldn’t sign in. Try again.";
}
