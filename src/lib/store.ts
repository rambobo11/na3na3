import type { DayTotal, Entry, WeekTotal } from "./types";
import {
  dayKey,
  lastNDayKeys,
  todayKey,
  weekEndKey,
  weekStartKey,
  yesterdayKey,
} from "./dates";

const STORAGE_KEY = "na3na3:entries";
const OWNER_KEY = "na3na3:owner";
const LEGACY_KEY = "na3na3:smokes";
const QUEUE_KEY = "na3na3:queue";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadEntries(): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (!legacy) return [];
      const parsed = JSON.parse(legacy) as Array<{
        id: string;
        smokedAt?: string;
        loggedAt?: string;
      }>;
      const migrated = parsed
        .filter((s) => s && typeof s.id === "string")
        .map((s) => ({
          id: s.id,
          loggedAt: s.loggedAt ?? s.smokedAt ?? new Date().toISOString(),
        }));
      saveEntries(migrated);
      localStorage.removeItem(LEGACY_KEY);
      return migrated;
    }
    const parsed = JSON.parse(raw) as Entry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s) => s && typeof s.id === "string" && typeof s.loggedAt === "string",
    );
  } catch {
    return [];
  }
}

export function saveEntries(entries: Entry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function loadOwnerId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(OWNER_KEY);
}

export function saveOwnerId(userId: string | null): void {
  if (typeof window === "undefined") return;
  if (!userId) localStorage.removeItem(OWNER_KEY);
  else localStorage.setItem(OWNER_KEY, userId);
}

/** Wipe local cache (sign-out / account switch). */
export function clearLocalData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(OWNER_KEY);
  localStorage.removeItem(LEGACY_KEY);
  localStorage.removeItem(QUEUE_KEY);
}

export function addEntries(
  entries: Entry[],
  count: number,
  at = new Date(),
): Entry[] {
  const stamped = at.toISOString();
  const next = [...entries];
  for (let i = 0; i < count; i++) {
    next.push({ id: newId(), loggedAt: stamped });
  }
  return next;
}

/** Remove the most recent entry from today (Paris). Falls back to last overall. */
export function removeLastEntry(entries: Entry[]): {
  entries: Entry[];
  removed: Entry | null;
} {
  if (entries.length === 0) return { entries, removed: null };
  const today = todayKey();
  let idx = -1;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (dayKey(entries[i].loggedAt) === today) {
      idx = i;
      break;
    }
  }
  if (idx === -1) idx = entries.length - 1;
  const removed = entries[idx];
  return {
    entries: [...entries.slice(0, idx), ...entries.slice(idx + 1)],
    removed,
  };
}

export function countToday(entries: Entry[]): number {
  return countOnDay(entries, todayKey());
}

export function countOnDay(entries: Entry[], key: string): number {
  let n = 0;
  for (const s of entries) {
    if (dayKey(s.loggedAt) === key) n++;
  }
  return n;
}

export function countYesterday(entries: Entry[]): number {
  return countOnDay(entries, yesterdayKey());
}

export function dailyTotals(entries: Entry[], days: number): DayTotal[] {
  const keys = lastNDayKeys(days);
  const map = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const s of entries) {
    const k = dayKey(s.loggedAt);
    if (map.has(k)) map.set(k, (map.get(k) ?? 0) + 1);
  }
  return keys.map((date) => ({ date, count: map.get(date) ?? 0 }));
}

export function sumTotals(totals: DayTotal[]): number {
  return totals.reduce((a, t) => a + t.count, 0);
}

export function average(totals: DayTotal[]): number {
  if (totals.length === 0) return 0;
  return sumTotals(totals) / totals.length;
}

/** Trailing 7-day moving average aligned to each day in `totals`. */
export function movingAverage7(
  allEntries: Entry[],
  windowDays: DayTotal[],
): number[] {
  return windowDays.map((d) => {
    const keys = lastNDayKeys(7, d.date);
    const set = new Set(keys);
    let n = 0;
    for (const s of allEntries) {
      if (set.has(dayKey(s.loggedAt))) n++;
    }
    return n / 7;
  });
}

/** Min/max among days with activity (count > 0). */
export function lowestHighest(totals: DayTotal[]): {
  lowest: DayTotal | null;
  highest: DayTotal | null;
} {
  const active = totals.filter((t) => t.count > 0);
  if (active.length === 0) return { lowest: null, highest: null };
  let lowest = active[0];
  let highest = active[0];
  for (const t of active) {
    if (t.count < lowest.count) lowest = t;
    if (t.count > highest.count) highest = t;
  }
  return { lowest, highest };
}

/**
 * Aggregate last `days` into Monday–Sunday weeks (Paris).
 * Partial first/last weeks are clipped to the requested window.
 */
export function weeklyTotals(entries: Entry[], days: number): WeekTotal[] {
  const daily = dailyTotals(entries, days);
  if (daily.length === 0) return [];

  const first = daily[0].date;
  const last = daily[daily.length - 1].date;
  const byWeek = new Map<string, number>();

  for (const d of daily) {
    const start = weekStartKey(d.date);
    byWeek.set(start, (byWeek.get(start) ?? 0) + d.count);
  }

  const starts = [...byWeek.keys()].sort();
  return starts.map((start) => {
    const naturalEnd = weekEndKey(start);
    const end = naturalEnd > last ? last : naturalEnd;
    const clippedStart = start < first ? first : start;
    return {
      start: clippedStart,
      end,
      count: byWeek.get(start) ?? 0,
    };
  });
}

/** Whether a calendar day falls in a week bar. */
export function weekContainsDay(week: WeekTotal, day: string): boolean {
  return day >= week.start && day <= week.end;
}
