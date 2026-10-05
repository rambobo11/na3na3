export type EntryKind = "na3" | "cha7et";

export type Entry = {
  id: string;
  loggedAt: string; // ISO 8601 timestamptz
  kind: EntryKind;
};

export type DayTotal = {
  date: string; // YYYY-MM-DD in Europe/Paris
  count: number;
};

export type WeekTotal = {
  start: string; // Monday YYYY-MM-DD (Paris)
  end: string; // Sunday YYYY-MM-DD (Paris), clipped to range
  count: number;
};

export function isEntryKind(v: unknown): v is EntryKind {
  return v === "na3" || v === "cha7et";
}

export function normalizeKind(v: unknown): EntryKind {
  return isEntryKind(v) ? v : "na3";
}
