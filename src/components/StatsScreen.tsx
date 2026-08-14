"use client";

import { useMemo, useState } from "react";
import { DailyChart, type ChartBar } from "@/components/DailyChart";
import { HourlyChart } from "@/components/HourlyChart";
import {
  formatAvg,
  formatMonthDay,
  formatShortDay,
  formatTime,
  formatWeekRange,
  todayKey,
} from "@/lib/dates";
import {
  average,
  countToday,
  countYesterday,
  dailyTotals,
  entriesForDay,
  hourlyTotals,
  lowestHighest,
  movingAverage7,
  sumTotals,
  weekContainsDay,
  weeklyTotals,
} from "@/lib/store";
import { useEntries } from "@/lib/use-entries";

type Range = 7 | 30 | 60 | 90 | 365;

const RANGES: { days: Range; label: string }[] = [
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 60, label: "60d" },
  { days: 90, label: "90d" },
  { days: 365, label: "1y" },
];

function isWeeklyRange(range: Range): boolean {
  return range === 90 || range === 365;
}

function rangeAvgLabel(range: Range): string {
  if (range === 365) return "1y avg";
  return `${range}d avg`;
}

export function StatsScreen() {
  const { ready, entries } = useEntries();
  const [range, setRange] = useState<Range>(7);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const weekly = isWeeklyRange(range);
  const today = todayKey();

  const dayTotals = useMemo(
    () => (ready ? dailyTotals(entries, range) : []),
    [ready, entries, range],
  );
  const weeks = useMemo(
    () => (ready && weekly ? weeklyTotals(entries, range) : []),
    [ready, entries, range, weekly],
  );

  const bars: ChartBar[] = useMemo(() => {
    if (!ready) return [];
    if (weekly) {
      return weeks.map((w) => ({
        id: w.start,
        count: w.count,
        label: formatMonthDay(w.start),
        current: weekContainsDay(w, today),
      }));
    }
    return dayTotals.map((d) => ({
      id: d.date,
      count: d.count,
      label:
        range <= 7
          ? formatShortDay(d.date).split(" ")[0]
          : d.date.slice(8),
      current: d.date === today,
    }));
  }, [ready, weekly, weeks, dayTotals, range, today]);

  const ma = useMemo(
    () =>
      ready && !weekly ? movingAverage7(entries, dayTotals) : undefined,
    [ready, weekly, entries, dayTotals],
  );

  const avg = useMemo(() => average(dayTotals), [dayTotals]);
  const total = useMemo(() => sumTotals(dayTotals), [dayTotals]);
  const { lowest, highest } = useMemo(
    () => lowestHighest(dayTotals),
    [dayTotals],
  );
  const todayCount = useMemo(
    () => (ready ? countToday(entries) : 0),
    [ready, entries],
  );
  const yesterdayCount = useMemo(
    () => (ready ? countYesterday(entries) : 0),
    [ready, entries],
  );

  const detailDay = useMemo(() => {
    if (!weekly && selectedId) return selectedId;
    return today;
  }, [weekly, selectedId, today]);

  const dayEntries = useMemo(
    () => (ready ? entriesForDay(entries, detailDay) : []),
    [ready, entries, detailDay],
  );
  const hours = useMemo(
    () => (ready ? hourlyTotals(entries, detailDay) : []),
    [ready, entries, detailDay],
  );
  const peakHour = useMemo(() => {
    if (hours.length === 0) return null;
    let best = hours[0];
    for (const h of hours) {
      if (h.count > best.count) best = h;
    }
    return best.count > 0 ? best : null;
  }, [hours]);

  const selectedDetail = useMemo(() => {
    if (!selectedId) return null;
    if (weekly) {
      const w = weeks.find((x) => x.start === selectedId);
      if (!w) return null;
      return `${formatWeekRange(w.start, w.end)} · ${w.count}`;
    }
    const d = dayTotals.find((x) => x.date === selectedId);
    if (!d) return null;
    return `${formatShortDay(d.date)} · ${d.count}`;
  }, [selectedId, weekly, weeks, dayTotals]);

  function onRange(next: Range) {
    setRange(next);
    setSelectedId(null);
  }

  return (
    <div className="app-screen mx-auto flex max-w-md flex-col">
      <header className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--fg)]">
          Stats
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {weekly ? "Weekly totals" : "Daily totals"}
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {RANGES.map(({ days, label }) => (
          <button
            key={days}
            type="button"
            onClick={() => onRange(days)}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              range === days
                ? "bg-[var(--fg)] text-[var(--bg)]"
                : "text-[var(--muted)] hover:text-[var(--fg)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-10">
        {ready ? (
          <DailyChart
            bars={bars}
            movingAvg={ma}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        ) : (
          <div className="h-40 animate-pulse rounded-lg bg-[var(--surface)]" />
        )}
        <p className="mt-2 text-center text-xs text-[var(--muted)]">
          {selectedDetail
            ? selectedDetail
            : weekly
              ? "Bars = weekly · tap a bar"
              : "Bars = daily · tap a day for times"}
        </p>
      </div>

      <dl className="mb-10 grid grid-cols-2 gap-x-6 gap-y-6">
        <Stat label="Today" value={ready ? String(todayCount) : "—"} />
        <Stat
          label="Yesterday"
          value={ready ? String(yesterdayCount) : "—"}
        />
        <Stat
          label={rangeAvgLabel(range)}
          value={ready ? formatAvg(avg) : "—"}
        />
        <Stat label="Total" value={ready ? String(total) : "—"} />
        <Stat
          label="Lowest"
          value={ready && lowest ? String(lowest.count) : "—"}
          hint={ready && lowest ? formatShortDay(lowest.date) : undefined}
        />
        <Stat
          label="Highest"
          value={ready && highest ? String(highest.count) : "—"}
          hint={ready && highest ? formatShortDay(highest.date) : undefined}
        />
      </dl>

      <section className="mb-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--fg)]">
            By hour
          </h2>
          <p className="text-xs text-[var(--muted)]">
            {detailDay === today ? "Today" : formatShortDay(detailDay)}
          </p>
        </div>

        {ready ? (
          <HourlyChart hours={hours} />
        ) : (
          <div className="h-24 animate-pulse rounded-lg bg-[var(--surface)]" />
        )}

        <p className="mt-2 text-xs text-[var(--muted)]">
          {peakHour
            ? `Peak ${String(peakHour.hour).padStart(2, "0")}:00 · ${peakHour.count}`
            : "No entries this day"}
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xs uppercase tracking-wider text-[var(--muted)]">
          Times
        </h2>
        {ready && dayEntries.length > 0 ? (
          <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {[...dayEntries].reverse().map((e, i) => (
              <li
                key={e.id}
                className="flex items-center justify-between text-sm text-[var(--fg)]"
              >
                <span className="tabular-nums text-[var(--muted)]">
                  #{dayEntries.length - i}
                </span>
                <span className="font-[family-name:var(--font-display)] text-base tabular-nums">
                  {formatTime(e.loggedAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">No times yet</p>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums text-[var(--fg)]">
        {value}
      </dd>
      {hint ? (
        <p className="mt-0.5 text-xs text-[var(--muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
