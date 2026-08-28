/** Map raw provider messages to short, actionable copy. */
export function friendlyAuthError(raw: string | null | undefined): string {
  if (!raw) return "Something went wrong. Try again.";
  const m = raw.toLowerCase();

  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "Wrong email or password. If you used the old email link before, tap Forgot password to set one.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirm your email first (check inbox), or turn Confirm email OFF in Supabase.";
  }
  if (
    m.includes("user already registered") ||
    m.includes("already been registered") ||
    m.includes("already registered")
  ) {
    return "Account already exists — use Sign in, or Forgot password if you never set a password.";
  }
  if (
    m.includes("password") &&
    (m.includes("least") || m.includes("weak") || m.includes("short"))
  ) {
    return "Password must be at least 6 characters.";
  }
  if (m.includes("same password") || m.includes("different from the old")) {
    return "Choose a password different from the old one.";
  }
  if (m.includes("rate") || m.includes("security") || m.includes("too many")) {
    return "Too many attempts. Wait a bit and try again.";
  }
  if (m.includes("invalid") && m.includes("email")) {
    return "That email looks invalid.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Network issue. Check your connection (try Brave if Safari fails).";
  }
  if (m.includes("not configured")) {
    return "Sync is not configured yet.";
  }

  return raw.length < 120 ? raw : "Couldn’t sign in. Try again.";
}
