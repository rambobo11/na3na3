"use client";

import { useMemo } from "react";

export type ChartBar = {
  id: string;
  count: number;
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
    const counts = bars.map((t) => t.count);
    const ma = movingAvg ?? [];
    return Math.max(1, ...counts, ...ma.map((n) => Math.ceil(n)));
  }, [bars, movingAvg]);

  const w = 320;
  const h = 168;
  const padL = 8;
  const padR = 8;
  const padT = 16;
  const padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const n = bars.length;
  const gap = n > 40 ? 1 : n > 14 ? 2 : 6;
  const barW = Math.max(
    1,
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
      <line
        x1={padL}
        x2={w - padR}
        y1={padT + innerH}
        y2={padT + innerH}
        stroke="var(--border)"
        strokeWidth={1}
      />

      {bars.map((t, i) => {
        const height = Math.max(t.count > 0 ? 3 : 0, barH(t.count));
        const selected = selectedId === t.id;
        const showLabel =
          i % labelEvery === 0 || i === n - 1 || t.current === true;
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
          >
            <rect
              x={barX(i)}
              y={padT}
              width={barW}
              height={innerH}
              fill="transparent"
            />
            <rect
              x={barX(i)}
              y={barY(t.count)}
              width={barW}
              height={height}
              rx={Math.min(4, barW / 2)}
              fill="var(--accent)"
              opacity={
                selected ? 1 : t.current ? 0.95 : t.count === 0 ? 0.2 : 0.75
              }
              stroke={selected || t.current ? "var(--fg)" : "none"}
              strokeWidth={selected || t.current ? 1.25 : 0}
            />
            {showLabel ? (
              <text
                x={barX(i) + barW / 2}
                y={h - 8}
                textAnchor="middle"
                className="fill-[var(--muted)] pointer-events-none"
                style={{ fontSize: n > 20 ? 8 : 9 }}
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
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.55}
          className="pointer-events-none"
        />
      ) : null}
    </svg>
  );
}
