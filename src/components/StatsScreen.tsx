"use client";

import { useEffect, useMemo, useState } from "react";
import { DailyChart, type ChartBar } from "@/components/DailyChart";
import { HourlyChart } from "@/components/HourlyChart";
import {
  CHA7ET_EUR,
  CIGS_PER_PACK,
  NA3_EUR,
  TOBACCO_PACK_EUR,
  formatEuro,
  formatPacks,
  moneyForCha7et,
  moneyForNa3,
  moneyTotal,
  packsForCha7et,
} from "@/lib/costs";
import { goalStatus, loadGoals, type DailyGoals } from "@/lib/goals";
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
  bestSmokeFreeStreak,
  countToday,
  countYesterday,
  currentSmokeFreeStreak,
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
  const [goals, setGoals] = useState<DailyGoals>({ na3: null, cha7et: null });
  const weekly = isWeeklyRange(range);
  const today = todayKey();

  useEffect(() => {
    setGoals(loadGoals());
  }, []);

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

  const moneyToday = useMemo(
    () => moneyTotal(todayA, todayB),
    [todayA, todayB],
  );
  const moneyTodayNa3 = useMemo(() => moneyForNa3(todayA), [todayA]);
  const moneyTodayCha7et = useMemo(() => moneyForCha7et(todayB), [todayB]);

  const moneyRange = useMemo(
    () => moneyTotal(totalA, totalB),
    [totalA, totalB],
  );
  const moneyRangeNa3 = useMemo(() => moneyForNa3(totalA), [totalA]);
  const moneyRangeCha7et = useMemo(() => moneyForCha7et(totalB), [totalB]);

  const moneyAll = useMemo(
    () =>
      ready ? moneyTotal(na3.length, cha7et.length) : 0,
    [ready, na3.length, cha7et.length],
  );
  const moneyAllNa3 = useMemo(
    () => (ready ? moneyForNa3(na3.length) : 0),
    [ready, na3.length],
  );
  const moneyAllCha7et = useMemo(
    () => (ready ? moneyForCha7et(cha7et.length) : 0),
    [ready, cha7et.length],
  );

  const moneyMonthPace = useMemo(() => {
    if (!ready) return 0;
    return moneyTotal(avgA * 30, avgB * 30);
  }, [ready, avgA, avgB]);

  const freeStreak = useMemo(
    () => (ready ? currentSmokeFreeStreak(entries) : 0),
    [ready, entries],
  );
  const bestFreeStreak = useMemo(
    () => (ready ? bestSmokeFreeStreak(entries) : 0),
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
      <section className="mb-6 grid grid-cols-2 gap-3">
        <HeroCount
          label="Na3Na3 · joints"
          value={ready ? todayA : null}
          tone="na3"
          goalMax={goals.na3}
        />
        <HeroCount
          label="cha7et · cig."
          value={ready ? todayB : null}
          tone="cha7et"
          goalMax={goals.cha7et}
        />
      </section>

      {(goals.na3 !== null || goals.cha7et !== null) && ready ? (
        <p className="mb-6 text-sm leading-relaxed text-[var(--muted)]">
          Objectif :{" "}
          {goals.na3 !== null ? (
            <span className="text-[var(--accent)]">
              {todayA}/{goals.na3} joints
              {goalStatus(todayA, goals.na3) === "over"
                ? " · dépassé"
                : goalStatus(todayA, goals.na3) === "at"
                  ? " · atteint"
                  : ""}
            </span>
          ) : (
            <span className="text-[var(--accent)]">joints off</span>
          )}
          {" · "}
          {goals.cha7et !== null ? (
            <span className="text-[var(--cha7et)]">
              {todayB}/{goals.cha7et} cig.
              {goalStatus(todayB, goals.cha7et) === "over"
                ? " · dépassé"
                : goalStatus(todayB, goals.cha7et) === "at"
                  ? " · atteint"
                  : ""}
            </span>
          ) : (
            <span className="text-[var(--cha7et)]">cig. off</span>
          )}
        </p>
      ) : null}

      {/* Smoke-free streak */}
      <section className="mb-8">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--fg)]">
          Jours sans
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Jours d’affilée à 0 joint et 0 cigarette
        </p>
        <div className="mt-4 grid grid-cols-2 gap-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
              En cours
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-[2.75rem] font-semibold tabular-nums tracking-tight leading-none text-[var(--accent)]">
              {ready ? freeStreak : "—"}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {ready && freeStreak === 0
                ? todayA + todayB > 0
                  ? "tu as loggé aujourd’hui — streak à 0"
                  : "passe une journée à 0 pour démarrer"
                : ready
                  ? freeStreak === 1
                    ? "jour"
                    : "jours"
                  : null}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
              Record
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-[2.75rem] font-semibold tabular-nums tracking-tight leading-none text-[var(--fg)]">
              {ready ? bestFreeStreak : "—"}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">meilleure série</p>
          </div>
        </div>
      </section>

      {/* Money lost — total first, then split */}
      <section className="mb-8">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--fg)]">
          Argent perdu
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
          Na3Na3 = joint {formatEuro(NA3_EUR)} · cha7et = cig.{" "}
          {formatEuro(TOBACCO_PACK_EUR)} / {CIGS_PER_PACK} (
          {formatEuro(CHA7ET_EUR)} pièce)
        </p>

        <div className="mt-5">
          <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
            Total perdu
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-[2.75rem] font-semibold tabular-nums tracking-tight leading-none text-[var(--fg)]">
            {ready ? formatEuro(moneyAll) : "—"}
          </p>
          <p className="mt-2 text-sm tabular-nums text-[var(--muted)]">
            <span className="text-[var(--accent)]">
              {ready ? formatEuro(moneyAllNa3) : "—"} joints
            </span>
            {" · "}
            <span className="text-[var(--cha7et)]">
              {ready ? formatEuro(moneyAllCha7et) : "—"} cig.
            </span>
            {ready && cha7et.length > 0 ? (
              <>
                {" · "}
                {formatPacks(packsForCha7et(cha7et.length))}
              </>
            ) : null}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-5">
          <MoneyPeriod
            label="Aujourd’hui"
            total={ready ? formatEuro(moneyToday) : "—"}
            na3={ready ? formatEuro(moneyTodayNa3) : "—"}
            cha7et={ready ? formatEuro(moneyTodayCha7et) : "—"}
          />
          <MoneyPeriod
            label={range === 365 ? "1 an" : `${range} jours`}
            total={ready ? formatEuro(moneyRange) : "—"}
            na3={ready ? formatEuro(moneyRangeNa3) : "—"}
            cha7et={ready ? formatEuro(moneyRangeCha7et) : "—"}
          />
          <MoneyPeriod
            label="Rythme / mois"
            total={
              ready && moneyMonthPace > 0 ? formatEuro(moneyMonthPace) : "—"
            }
            na3={
              ready && avgA > 0 ? formatEuro(moneyForNa3(avgA * 30)) : "—"
            }
            cha7et={
              ready && avgB > 0 ? formatEuro(moneyForCha7et(avgB * 30)) : "—"
            }
            hint={
              ready && (avgA > 0 || avgB > 0)
                ? "si tu continues à ce rythme"
                : undefined
            }
          />
        </div>

        {ready && moneyMonthPace > 0 ? (
          <p className="mt-5 text-sm leading-relaxed text-[var(--muted)]">
            Si tu arrêtes à ce rythme, tu{" "}
            <span className="font-medium text-[var(--accent)]">
              gardes ~{formatEuro(moneyMonthPace)}
            </span>{" "}
            par mois —{" "}
            <span className="font-medium text-[var(--fg)]">
              ~{formatEuro(moneyMonthPace * 12)}
            </span>{" "}
            par an.
          </p>
        ) : null}
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
  goalMax,
}: {
  label: string;
  value: number | null;
  tone: "na3" | "cha7et";
  goalMax?: number | null;
}) {
  const color = tone === "cha7et" ? "var(--cha7et)" : "var(--accent)";
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </p>
      <p
        className="mt-1 font-[family-name:var(--font-display)] text-[2.75rem] font-semibold tabular-nums tracking-tight leading-none"
        style={{ color }}
      >
        {value === null ? "—" : value}
        {goalMax !== null && goalMax !== undefined ? (
          <span className="text-lg font-medium text-[var(--muted)]">
            /{goalMax}
          </span>
        ) : null}
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

function MoneyPeriod({
  label,
  total,
  na3,
  cha7et,
  hint,
  highlight,
}: {
  label: string;
  total: string;
  na3: string;
  cha7et: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p
        className={`mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums tracking-tight ${
          highlight ? "text-[var(--accent)]" : "text-[var(--fg)]"
        }`}
      >
        {total}
      </p>
      <p className="mt-1 text-xs tabular-nums leading-relaxed text-[var(--muted)]">
        <span className="text-[var(--accent)]">{na3}</span>
        {" + "}
        <span className="text-[var(--cha7et)]">{cha7et}</span>
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
