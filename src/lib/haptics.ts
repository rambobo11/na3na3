/** Light haptic when available (Android vibrate; no-op on most iOS Safari). */
export function haptic(style: "light" | "medium" | "heavy" = "light"): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  const ms = style === "heavy" ? 24 : style === "medium" ? 14 : 8;
  try {
    navigator.vibrate(ms);
  } catch {
    // ignore
  }
}
