/** Map raw provider messages to short, non-leaky copy. */
export function friendlyAuthError(raw: string | null | undefined): string {
  if (!raw) return "Something went wrong. Try again.";
  const m = raw.toLowerCase();

  if (m.includes("otp") || m.includes("token") || m.includes("code")) {
    return "Invalid or expired code. Request a new one.";
  }
  if (m.includes("rate") || m.includes("security")) {
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

  return "Couldn’t send the link. Try again.";
}
