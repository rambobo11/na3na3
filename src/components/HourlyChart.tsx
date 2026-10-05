"use client";

import { useMemo } from "react";
import type { HourTotal } from "@/lib/store";

type Props = {
  hours: HourTotal[];
  hoursB?: HourTotal[];
};

export function HourlyChart({ hours, hoursB }: Props) {
  const max = useMemo(() => {
    const a = hours.map((h) => h.count);
    const b = (hoursB ?? []).map((h) => h.count);
    return Math.max(1, ...a, ...b);
  }, [hours, hoursB]);

  const w = 320;
  const h = 120;
  const padL = 4;
  const padR = 4;
  const padT = 10;
  const padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const gap = 2;
  const barW = (innerW - gap * 23) / 24;

  const barX = (i: number) => padL + i * (barW + gap);
  const barH = (count: number) => (count / max) * innerH;
  const barY = (count: number) => padT + innerH - barH(count);

  const labelHours = [0, 3, 6, 9, 12, 15, 18, 21];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-auto w-full"
      role="img"
      aria-label="Hourly counts"
    >
      <line
        x1={padL}
        x2={w - padR}
        y1={padT + innerH}
        y2={padT + innerH}
        stroke="var(--border)"
        strokeWidth={1}
      />
      {hours.map((t) => {
        const b = hoursB?.[t.hour]?.count ?? 0;
        const heightA = Math.max(t.count > 0 ? 3 : 0, barH(t.count));
        const heightB = Math.max(b > 0 ? 3 : 0, barH(b));
        const pairGap = 1;
        const wA = (barW - pairGap) * 0.5;
        const wB = (barW - pairGap) * 0.5;
        return (
          <g key={t.hour}>
            <rect
              x={barX(t.hour)}
              y={barY(t.count)}
              width={wA}
              height={heightA}
              rx={Math.min(2.5, wA / 2)}
              fill="var(--accent)"
              opacity={t.count === 0 ? 0.12 : 0.92}
            />
            <rect
              x={barX(t.hour) + wA + pairGap}
              y={barY(b)}
              width={wB}
              height={heightB}
              rx={Math.min(2.5, wB / 2)}
              fill="var(--cha7et)"
              opacity={b === 0 ? 0.1 : 0.9}
            />
          </g>
        );
      })}
      {labelHours.map((hour) => (
        <text
          key={hour}
          x={barX(hour) + barW / 2}
          y={h - 8}
          textAnchor="middle"
          fill="var(--muted)"
          style={{ fontSize: 8 }}
        >
          {formatClockLabel(hour)}
        </text>
      ))}
    </svg>
  );
}

function formatClockLabel(hour: number): string {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}
