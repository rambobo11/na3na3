import type { DayTotal, Entry } from "./types";
import { dayKey, lastNDayKeys, todayKey } from "./dates";

const STORAGE_KEY = "na3na3:entries";
const OWNER_KEY = "na3na3:owner";

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
      // migrate old local key if present
      const legacy = localStorage.getItem("na3na3:smokes");
      if (!legacy) return [];
      const parsed = JSON.parse(legacy) as Array<{
        id: string;
        smokedAt?: string;
        loggedAt?: string;
      }>;
      return parsed
        .filter((s) => s && typeof s.id === "string")
        .map((s) => ({
          id: s.id,
          loggedAt: s.loggedAt ?? s.smokedAt ?? new Date().toISOString(),
        }));
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
  const today = todayKey();
  let n = 0;
  for (const s of entries) {
    if (dayKey(s.loggedAt) === today) n++;
  }
  return n;
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

export function average(totals: DayTotal[]): number {
  if (totals.length === 0) return 0;
  const sum = totals.reduce((a, t) => a + t.count, 0);
  return sum / totals.length;
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

export function bestWorst(totals: DayTotal[]): {
  best: DayTotal | null;
  worst: DayTotal | null;
} {
  if (totals.length === 0) return { best: null, worst: null };
  let best = totals[0];
  let worst = totals[0];
  for (const t of totals) {
    if (t.count < best.count) best = t;
    if (t.count > worst.count) worst = t;
  }
  return { best, worst };
}
