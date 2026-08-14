"use client";

import { useMemo } from "react";
import type { DayTotal } from "@/lib/types";
import { formatShortDay } from "@/lib/dates";

type Props = {
  totals: DayTotal[];
  movingAvg?: number[];
};

export function DailyChart({ totals, movingAvg }: Props) {
  const max = useMemo(() => {
    const counts = totals.map((t) => t.count);
    const ma = movingAvg ?? [];
    return Math.max(1, ...counts, ...ma.map((n) => Math.ceil(n)));
  }, [totals, movingAvg]);

  const w = 320;
  const h = 160;
  const padL = 8;
  const padR = 8;
  const padT = 16;
  const padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const gap =
    totals.length > 180 ? 0.5 : totals.length > 60 ? 1 : totals.length > 14 ? 2 : 6;
  const barW = Math.max(
    0.75,
    (innerW - gap * Math.max(0, totals.length - 1)) / totals.length,
  );

  const barX = (i: number) => padL + i * (barW + gap);
  const barH = (count: number) => (count / max) * innerH;
  const barY = (count: number) => padT + innerH - barH(count);

  const maPoints = (movingAvg ?? [])
    .map((v, i) => {
      const x = barX(i) + barW / 2;
      const y = padT + innerH - (v / max) * innerH;
      return `${x},${y}`;
    })
    .join(" ");

  const labelEvery =
    totals.length > 180 ? 60 : totals.length > 90 ? 30 : totals.length > 14 ? 7 : 1;

  const labelFor = (date: string, i: number) => {
    if (totals.length > 90) {
      // Month tick for long ranges (show when month changes, or first/last)
      const month = date.slice(5, 7);
      const prev = i > 0 ? totals[i - 1].date.slice(5, 7) : null;
      if (i === 0 || i === totals.length - 1 || month !== prev) {
        return date.slice(5, 7);
      }
      return null;
    }
    if (totals.length > 14) return date.slice(8);
    return formatShortDay(date).split(" ")[0];
  };

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-auto w-full"
      role="img"
      aria-label="Daily counts"
    >
      {/* baseline */}
      <line
        x1={padL}
        x2={w - padR}
        y1={padT + innerH}
        y2={padT + innerH}
        stroke="var(--border)"
        strokeWidth={1}
      />

      {totals.map((t, i) => {
        const height = Math.max(t.count > 0 ? 3 : 0, barH(t.count));
        return (
          <g key={t.date}>
            <rect
              x={barX(i)}
              y={barY(t.count)}
              width={barW}
              height={height}
              rx={Math.min(4, barW / 2)}
              fill="var(--accent)"
              opacity={t.count === 0 ? 0.2 : 0.9}
            />
            {(() => {
              const label =
                totals.length > 90
                  ? labelFor(t.date, i)
                  : i % labelEvery === 0 || i === totals.length - 1
                    ? labelFor(t.date, i)
                    : null;
              if (!label) return null;
              return (
                <text
                  x={barX(i) + barW / 2}
                  y={h - 8}
                  textAnchor="middle"
                  className="fill-[var(--muted)]"
                  style={{ fontSize: totals.length > 60 ? 8 : 9 }}
                >
                  {label}
                </text>
              );
            })()}
          </g>
        );
      })}

      {movingAvg && movingAvg.length === totals.length ? (
        <polyline
          points={maPoints}
          fill="none"
          stroke="var(--fg)"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.55}
        />
      ) : null}
    </svg>
  );
}
