"use client";

import { useMemo } from "react";

export type ChartBar = {
  id: string;
  count: number;
  /** Second series (cha7et) — drawn overlapping in blue */
  countB?: number;
  label: string;
  current?: boolean;
};

type Props = {
  bars: ChartBar[];
  movingAvg?: number[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function DailyChart({ bars, movingAvg, selectedId, onSelect }: Props) {
  const max = useMemo(() => {
    const counts = bars.flatMap((t) => [t.count, t.countB ?? 0]);
    const ma = movingAvg ?? [];
    return Math.max(1, ...counts, ...ma.map((n) => Math.ceil(n)));
  }, [bars, movingAvg]);

  const w = 320;
  const h = 200;
  const padL = 4;
  const padR = 4;
  const padT = 18;
  const padB = 30;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const n = bars.length;
  const gap = n > 40 ? 1.5 : n > 14 ? 3 : 7;
  const barW = Math.max(
    2,
    (innerW - gap * Math.max(0, n - 1)) / Math.max(1, n),
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
    n > 26 ? Math.ceil(n / 6) : n > 14 ? Math.ceil(n / 7) : 1;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-auto w-full touch-manipulation"
      role="img"
      aria-label="Period counts"
    >
      <defs>
        <linearGradient id="na3Bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.72" />
        </linearGradient>
        <linearGradient id="cha7etBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cha7et)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--cha7et)" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* soft baseline */}
      <line
        x1={padL}
        x2={w - padR}
        y1={padT + innerH}
        y2={padT + innerH}
        stroke="var(--border)"
        strokeWidth={1}
      />

      {bars.map((t, i) => {
        const countB = t.countB ?? 0;
        const heightA = Math.max(t.count > 0 ? 4 : 0, barH(t.count));
        const heightB = Math.max(countB > 0 ? 4 : 0, barH(countB));
        const selected = selectedId === t.id;
        const showLabel =
          i % labelEvery === 0 || i === n - 1 || t.current === true;
        const pairGap = Math.min(2, barW * 0.08);
        const wA = (barW - pairGap) * 0.52;
        const wB = (barW - pairGap) * 0.52;
        const xA = barX(i);
        const xB = barX(i) + wA + pairGap;
        const dim = selectedId && !selected;
        return (
          <g
            key={t.id}
            role="button"
            tabIndex={0}
            className="cursor-pointer"
            onClick={() => onSelect(t.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(t.id);
              }
            }}
            opacity={dim ? 0.35 : 1}
          >
            <rect
              x={barX(i) - gap / 2}
              y={padT}
              width={barW + gap}
              height={innerH}
              fill="transparent"
            />
            {selected ? (
              <rect
                x={barX(i) - 2}
                y={padT - 4}
                width={barW + 4}
                height={innerH + 8}
                rx={6}
                fill="var(--surface)"
                opacity={0.9}
              />
            ) : null}
            <rect
              x={xA}
              y={barY(t.count)}
              width={wA}
              height={heightA}
              rx={Math.min(5, wA / 2)}
              fill="url(#na3Bar)"
              opacity={t.count === 0 ? 0.16 : t.current || selected ? 1 : 0.88}
            />
            <rect
              x={xB}
              y={barY(countB)}
              width={wB}
              height={heightB}
              rx={Math.min(5, wB / 2)}
              fill="url(#cha7etBar)"
              opacity={countB === 0 ? 0.14 : t.current || selected ? 1 : 0.85}
            />
            {showLabel ? (
              <text
                x={barX(i) + barW / 2}
                y={h - 10}
                textAnchor="middle"
                className="pointer-events-none"
                fill={
                  selected || t.current ? "var(--fg)" : "var(--muted)"
                }
                style={{
                  fontSize: n > 20 ? 8 : 10,
                  fontWeight: selected || t.current ? 600 : 400,
                }}
              >
                {t.label}
              </text>
            ) : null}
          </g>
        );
      })}

      {movingAvg && movingAvg.length === bars.length ? (
        <polyline
          points={maPoints}
          fill="none"
          stroke="var(--fg)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.35}
          className="pointer-events-none"
        />
      ) : null}
    </svg>
  );
}
