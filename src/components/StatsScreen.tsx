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

  const selectedCounts = useMemo(() => {
    if (!selectedId) return null;
    if (weekly) {
      const a = weeksA.find((x) => x.start === selectedId);
      const b = weeksB.find((x) => x.start === selectedId);
      if (!a && !b) return null;
      return {
        title: formatWeekRange(a?.start ?? b!.start, a?.end ?? b!.end),
        a: a?.count ?? 0,
        b: b?.count ?? 0,
      };
    }
    const a = dayTotalsA.find((x) => x.date === selectedId);
    const b = dayTotalsB.find((x) => x.date === selectedId);
    if (!a && !b) return null;
    return {
      title: formatShortDay(a?.date ?? b!.date),
      a: a?.count ?? 0,
      b: b?.count ?? 0,
    };
  }, [selectedId, weekly, weeksA, weeksB, dayTotalsA, dayTotalsB]);

  function onRange(next: Range) {
    setRange(next);
    setSelectedId(null);
  }

  return (
    <div className="app-screen mx-auto flex max-w-md flex-col">
      <header className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--fg)]">
          Stats
        </h1>
        <div className="mt-3 flex items-center gap-4 text-sm">
          <LegendDot color="var(--accent)" label="Na3Na3" />
          <LegendDot color="var(--cha7et)" label="cha7et" />
        </div>
      </header>

      {/* Today hero */}
      <section className="mb-8 grid grid-cols-2 gap-3">
        <HeroCount
          label="Na3Na3 today"
          value={ready ? todayA : null}
          tone="na3"
        />
        <HeroCount
          label="cha7et today"
          value={ready ? todayB : null}
          tone="cha7et"
        />
      </section>

      {/* Range */}
      <div className="mb-5 flex rounded-full bg-[var(--surface)] p-1">
        {RANGES.map(({ days, label }) => (
          <button
            key={days}
            type="button"
            onClick={() => onRange(days)}
            className={`min-h-9 flex-1 rounded-full text-sm transition-colors ${
              range === days
                ? "bg-[var(--fg)] font-medium text-[var(--bg)]"
                : "text-[var(--muted)] active:text-[var(--fg)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="mb-3 text-xs text-[var(--muted)]">
        {weekly ? "Weekly totals" : "Daily totals"}
        {ma ? " · line = 7-day avg" : ""}
      </p>

      <section className="mb-8">
        {ready ? (
          <DailyChart
            bars={bars}
            movingAvg={ma}
            selectedId={selectedId}
            onSelect={(id) =>
              setSelectedId((prev) => (prev === id ? null : id))
            }
          />
        ) : (
          <div className="h-48 animate-pulse rounded-2xl bg-[var(--surface)]" />
        )}

        <div className="mt-3 min-h-8 text-center">
          {selectedCounts ? (
            <p className="text-sm tabular-nums text-[var(--fg)]">
              <span className="text-[var(--muted)]">{selectedCounts.title}</span>
              {" · "}
              <span className="font-semibold text-[var(--accent)]">
                {selectedCounts.a}
              </span>
              <span className="text-[var(--muted)]"> / </span>
              <span className="font-semibold text-[var(--cha7et)]">
                {selectedCounts.b}
              </span>
            </p>
          ) : (
            <p className="text-xs text-[var(--muted)]">
              Tap a bar to compare
            </p>
          )}
        </div>
      </section>

      {/* Compact KPI grid */}
      <section className="mb-10 grid grid-cols-2 gap-x-5 gap-y-5">
        <CompactDual
          label="Yesterday"
          a={ready ? yesterdayA : null}
          b={ready ? yesterdayB : null}
        />
        <CompactDual
          label={rangeAvgLabel(range)}
          a={ready ? formatAvg(avgA) : null}
          b={ready ? formatAvg(avgB) : null}
        />
        <CompactDual
          label="Total"
          a={ready ? totalA : null}
          b={ready ? totalB : null}
        />
        <CompactDual
          label="Peak day"
          a={ready && highA ? String(highA.count) : null}
          b={ready && highB ? String(highB.count) : null}
          hint={
            ready && (highA || highB)
              ? [
                  highA ? formatShortDay(highA.date) : null,
                  highB ? formatShortDay(highB.date) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : undefined
          }
        />
        <CompactDual
          label="Lowest day"
          a={ready && lowA ? String(lowA.count) : null}
          b={ready && lowB ? String(lowB.count) : null}
          hint={
            ready && (lowA || lowB)
              ? [
                  lowA ? formatShortDay(lowA.date) : null,
                  lowB ? formatShortDay(lowB.date) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : undefined
          }
        />
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--fg)]">
            By hour
          </h2>
          <p className="text-xs tabular-nums text-[var(--muted)]">
            {detailDay === today ? "Today" : formatShortDay(detailDay)}
          </p>
        </div>
        {ready ? (
          <HourlyChart hours={hoursA} hoursB={hoursB} />
        ) : (
          <div className="h-28 animate-pulse rounded-2xl bg-[var(--surface)]" />
        )}
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--fg)]">
          Times
        </h2>
        {ready && dayEntries.length > 0 ? (
          <ul className="max-h-60 space-y-1 overflow-y-auto pr-1">
            {[...dayEntries].reverse().map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="flex items-center gap-2.5 text-sm">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      background:
                        e.kind === "cha7et"
                          ? "var(--cha7et)"
                          : "var(--accent)",
                    }}
                    aria-hidden
                  />
                  <span className="text-[var(--muted)]">
                    {e.kind === "cha7et" ? "cha7et" : "Na3Na3"}
                  </span>
                </span>
                <span className="font-[family-name:var(--font-display)] text-base font-medium tabular-nums text-[var(--fg)]">
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

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[var(--muted)]">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      <span className="text-[var(--fg)]">{label}</span>
    </span>
  );
}

function HeroCount({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | null;
  tone: "na3" | "cha7et";
}) {
  const color = tone === "cha7et" ? "var(--cha7et)" : "var(--accent)";
  return (
    <div className="rounded-3xl bg-[var(--surface)]/70 px-4 py-4">
      <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p
        className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold tabular-nums tracking-tight"
        style={{ color }}
      >
        {value === null ? "—" : value}
      </p>
    </div>
  );
}

function CompactDual({
  label,
  a,
  b,
  hint,
}: {
  label: string;
  a: string | number | null;
  b: string | number | null;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums">
        <span className="text-[var(--accent)]">{a ?? "—"}</span>
        <span className="mx-1.5 text-[var(--border)]">/</span>
        <span className="text-[var(--cha7et)]">{b ?? "—"}</span>
      </p>
      {hint ? (
        <p className="mt-0.5 text-xs text-[var(--muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
