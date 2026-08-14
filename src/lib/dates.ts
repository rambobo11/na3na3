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

const monthDayFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
});

const weekdayShortFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  weekday: "short",
});

/** Local calendar day key YYYY-MM-DD in Europe/Paris. */
export function dayKey(date: Date | string = new Date()): string {
  return dayFmt.format(typeof date === "string" ? new Date(date) : date);
}

export function todayKey(): string {
  return dayKey(new Date());
}

export function yesterdayKey(): string {
  return shiftDayKey(todayKey(), -1);
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

/** 0 = Sunday … 6 = Saturday in Europe/Paris. */
function parisWeekday(key: string): number {
  const short = weekdayShortFmt.format(new Date(`${key}T12:00:00Z`));
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[short] ?? 1;
}

/** Monday of the ISO-style week containing `key` (Paris calendar). */
export function weekStartKey(key: string): string {
  const wd = parisWeekday(key);
  const fromMonday = wd === 0 ? 6 : wd - 1;
  return shiftDayKey(key, -fromMonday);
}

export function weekEndKey(start: string): string {
  return shiftDayKey(start, 6);
}

export function formatShortDay(key: string): string {
  return shortDayFmt.format(new Date(`${key}T12:00:00Z`));
}

export function formatMonthDay(key: string): string {
  return monthDayFmt.format(new Date(`${key}T12:00:00Z`));
}

/** e.g. "12–18 Jan" (same month) or "28 Dec–3 Jan". */
export function formatWeekRange(start: string, end: string): string {
  const a = formatMonthDay(start);
  const b = formatMonthDay(end);
  return `${a}–${b}`;
}

export function formatAvg(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
