export type Entry = {
  id: string;
  loggedAt: string; // ISO 8601 timestamptz
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
