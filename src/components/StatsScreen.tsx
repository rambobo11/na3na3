"use client";

import { useMemo, useState } from "react";
import { DailyChart } from "@/components/DailyChart";
import { formatAvg, formatShortDay } from "@/lib/dates";
import {
  average,
  bestWorst,
  dailyTotals,
  movingAverage7,
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

function rangeAvgLabel(range: Range): string {
  if (range === 365) return "1y avg";
  return `${range}-day avg`;
}

export function StatsScreen() {
  const { ready, entries, today } = useEntries();
  const [range, setRange] = useState<Range>(7);

  const totals = useMemo(
    () => (ready ? dailyTotals(entries, range) : []),
    [ready, entries, range],
  );
  const ma = useMemo(
    () => (ready ? movingAverage7(entries, totals) : []),
    [ready, entries, totals],
  );
  const avg = useMemo(() => average(totals), [totals]);
  const { best, worst } = useMemo(() => bestWorst(totals), [totals]);

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--fg)]">
          Stats
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Daily totals</p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {RANGES.map(({ days, label }) => (
          <button
            key={days}
            type="button"
            onClick={() => setRange(days)}
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
          <DailyChart totals={totals} movingAvg={ma} />
        ) : (
          <div className="h-40 animate-pulse rounded-lg bg-[var(--surface)]" />
        )}
        <p className="mt-2 text-center text-xs text-[var(--muted)]">
          Bars = daily · line = 7-day avg
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-6">
        <Stat label="Today" value={ready ? String(today) : "—"} />
        <Stat
          label={rangeAvgLabel(range)}
          value={ready ? formatAvg(avg) : "—"}
        />
        <Stat
          label="Best day"
          value={
            ready && best
              ? `${best.count}`
              : "—"
          }
          hint={ready && best ? formatShortDay(best.date) : undefined}
        />
        <Stat
          label="Worst day"
          value={
            ready && worst
              ? `${worst.count}`
              : "—"
          }
          hint={ready && worst ? formatShortDay(worst.date) : undefined}
        />
      </dl>
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
