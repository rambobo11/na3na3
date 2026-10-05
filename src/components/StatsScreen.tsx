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
  filterByKind,
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

  const na3 = useMemo(() => filterByKind(entries, "na3"), [entries]);
  const cha7et = useMemo(() => filterByKind(entries, "cha7et"), [entries]);

  const dayTotalsA = useMemo(
    () => (ready ? dailyTotals(na3, range) : []),
    [ready, na3, range],
  );
  const dayTotalsB = useMemo(
    () => (ready ? dailyTotals(cha7et, range) : []),
    [ready, cha7et, range],
  );
  const weeksA = useMemo(
    () => (ready && weekly ? weeklyTotals(na3, range) : []),
    [ready, na3, range, weekly],
  );
  const weeksB = useMemo(
    () => (ready && weekly ? weeklyTotals(cha7et, range) : []),
    [ready, cha7et, range, weekly],
  );

  const bars: ChartBar[] = useMemo(() => {
    if (!ready) return [];
    if (weekly) {
      const aMap = new Map(weeksA.map((w) => [w.start, w]));
      const bMap = new Map(weeksB.map((w) => [w.start, w]));
      const starts = [
        ...new Set([...aMap.keys(), ...bMap.keys()]),
      ].sort();
      return starts.map((start) => {
        const a = aMap.get(start);
        const b = bMap.get(start);
        const week = a ?? b!;
        return {
          id: start,
          count: a?.count ?? 0,
          countB: b?.count ?? 0,
          label: formatMonthDay(start),
          current: weekContainsDay(week, today),
        };
      });
    }
    const bMap = new Map(dayTotalsB.map((d) => [d.date, d.count]));
    return dayTotalsA.map((d) => ({
      id: d.date,
      count: d.count,
      countB: bMap.get(d.date) ?? 0,
      label:
        range <= 7
          ? formatShortDay(d.date).split(" ")[0]
          : d.date.slice(8),
      current: d.date === today,
    }));
  }, [ready, weekly, weeksA, weeksB, dayTotalsA, dayTotalsB, range, today]);

  const ma = useMemo(
    () =>
      ready && !weekly ? movingAverage7(na3, dayTotalsA) : undefined,
    [ready, weekly, na3, dayTotalsA],
  );

  const avgA = useMemo(() => average(dayTotalsA), [dayTotalsA]);
  const avgB = useMemo(() => average(dayTotalsB), [dayTotalsB]);
  const totalA = useMemo(() => sumTotals(dayTotalsA), [dayTotalsA]);
  const totalB = useMemo(() => sumTotals(dayTotalsB), [dayTotalsB]);
  const { lowest: lowA, highest: highA } = useMemo(
    () => lowestHighest(dayTotalsA),
    [dayTotalsA],
  );
  const { lowest: lowB, highest: highB } = useMemo(
    () => lowestHighest(dayTotalsB),
    [dayTotalsB],
  );
  const todayA = useMemo(() => (ready ? countToday(na3) : 0), [ready, na3]);
  const todayB = useMemo(
    () => (ready ? countToday(cha7et) : 0),
    [ready, cha7et],
  );
  const yesterdayA = useMemo(
    () => (ready ? countYesterday(na3) : 0),
    [ready, na3],
  );
  const yesterdayB = useMemo(
    () => (ready ? countYesterday(cha7et) : 0),
    [ready, cha7et],
  );

  const detailDay = useMemo(() => {
    if (!weekly && selectedId) return selectedId;
    return today;
  }, [weekly, selectedId, today]);

  const dayEntries = useMemo(
    () => (ready ? entriesForDay(entries, detailDay) : []),
    [ready, entries, detailDay],
  );
  const hoursA = useMemo(
    () => (ready ? hourlyTotals(na3, detailDay) : []),
    [ready, na3, detailDay],
  );
  const hoursB = useMemo(
    () => (ready ? hourlyTotals(cha7et, detailDay) : []),
    [ready, cha7et, detailDay],
  );

  const selectedDetail = useMemo(() => {
    if (!selectedId) return null;
    if (weekly) {
      const a = weeksA.find((x) => x.start === selectedId);
      const b = weeksB.find((x) => x.start === selectedId);
      if (!a && !b) return null;
      const start = a?.start ?? b!.start;
      const end = a?.end ?? b!.end;
      return `${formatWeekRange(start, end)} · ${a?.count ?? 0} / ${b?.count ?? 0}`;
    }
    const a = dayTotalsA.find((x) => x.date === selectedId);
    const b = dayTotalsB.find((x) => x.date === selectedId);
    if (!a && !b) return null;
    const date = a?.date ?? b!.date;
    return `${formatShortDay(date)} · ${a?.count ?? 0} / ${b?.count ?? 0}`;
  }, [selectedId, weekly, weeksA, weeksB, dayTotalsA, dayTotalsB]);

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
          {" · "}
          <span className="text-[var(--accent)]">Na3Na3</span>
          {" / "}
          <span className="text-[var(--cha7et)]">cha7et</span>
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
              ? "Green = Na3Na3 · blue = cha7et · tap a bar"
              : "Green = Na3Na3 · blue = cha7et · tap a day"}
        </p>
      </div>

      <dl className="mb-10 grid grid-cols-2 gap-x-6 gap-y-6">
        <DualStat
          label="Today"
          a={ready ? todayA : null}
          b={ready ? todayB : null}
        />
        <DualStat
          label="Yesterday"
          a={ready ? yesterdayA : null}
          b={ready ? yesterdayB : null}
        />
        <DualStat
          label={rangeAvgLabel(range)}
          a={ready ? formatAvg(avgA) : null}
          b={ready ? formatAvg(avgB) : null}
        />
        <DualStat
          label="Total"
          a={ready ? totalA : null}
          b={ready ? totalB : null}
        />
        <DualStat
          label="Lowest"
          a={ready && lowA ? String(lowA.count) : null}
          b={ready && lowB ? String(lowB.count) : null}
          hintA={ready && lowA ? formatShortDay(lowA.date) : undefined}
          hintB={ready && lowB ? formatShortDay(lowB.date) : undefined}
        />
        <DualStat
          label="Highest"
          a={ready && highA ? String(highA.count) : null}
          b={ready && highB ? String(highB.count) : null}
          hintA={ready && highA ? formatShortDay(highA.date) : undefined}
          hintB={ready && highB ? formatShortDay(highB.date) : undefined}
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
          <HourlyChart hours={hoursA} hoursB={hoursB} />
        ) : (
          <div className="h-24 animate-pulse rounded-lg bg-[var(--surface)]" />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs uppercase tracking-wider text-[var(--muted)]">
          Times
        </h2>
        {ready && dayEntries.length > 0 ? (
          <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {[...dayEntries].reverse().map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between text-sm text-[var(--fg)]"
              >
                <span
                  className={`text-xs uppercase tracking-wider ${
                    e.kind === "cha7et"
                      ? "text-[var(--cha7et)]"
                      : "text-[var(--accent)]"
                  }`}
                >
                  {e.kind === "cha7et" ? "cha7et" : "Na3Na3"}
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

function DualStat({
  label,
  a,
  b,
  hintA,
  hintB,
}: {
  label: string;
  a: string | number | null;
  b: string | number | null;
  hintA?: string;
  hintB?: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums">
        <span className="text-[var(--accent)]">{a ?? "—"}</span>
        <span className="mx-1 text-[var(--muted)]">/</span>
        <span className="text-[var(--cha7et)]">{b ?? "—"}</span>
      </dd>
      {hintA || hintB ? (
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          {hintA ?? "—"}
          {" · "}
          {hintB ?? "—"}
        </p>
      ) : null}
    </div>
  );
}
