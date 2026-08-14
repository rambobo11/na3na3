export type Entry = {
  id: string;
  loggedAt: string; // ISO 8601 timestamptz
};

export type DayTotal = {
  date: string; // YYYY-MM-DD in Europe/Paris
  count: number;
};
