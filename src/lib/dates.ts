const TZ = "Europe/Paris";

const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const shortDayFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  weekday: "short",
  day: "numeric",
});

/** Local calendar day key YYYY-MM-DD in Europe/Paris. */
export function dayKey(date: Date | string = new Date()): string {
  return dayFmt.format(typeof date === "string" ? new Date(date) : date);
}

export function todayKey(): string {
  return dayKey(new Date());
}

/** Shift a YYYY-MM-DD key by `delta` calendar days (Paris). */
export function shiftDayKey(key: string, delta: number): string {
  // Noon UTC avoids DST edge cases when interpreting the calendar date.
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return dayKey(d);
}

/** Last `n` day keys ending with today (oldest → newest). */
export function lastNDayKeys(n: number, end: string = todayKey()): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(shiftDayKey(end, -i));
  }
  return keys;
}

export function formatShortDay(key: string): string {
  return shortDayFmt.format(new Date(`${key}T12:00:00Z`));
}

export function formatAvg(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
