"use client";

import { useMemo } from "react";
import type { HourTotal } from "@/lib/store";

type Props = {
  hours: HourTotal[];
};

export function HourlyChart({ hours }: Props) {
  const max = useMemo(
    () => Math.max(1, ...hours.map((h) => h.count)),
    [hours],
  );

  const w = 320;
  const h = 100;
  const padL = 4;
  const padR = 4;
  const padT = 8;
  const padB = 20;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const gap = 1.5;
  const barW = (innerW - gap * 23) / 24;

  const barX = (i: number) => padL + i * (barW + gap);
  const barH = (count: number) => (count / max) * innerH;
  const barY = (count: number) => padT + innerH - barH(count);

  const labelHours = [0, 6, 12, 18, 23];

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
        const height = Math.max(t.count > 0 ? 2 : 0, barH(t.count));
        return (
          <rect
            key={t.hour}
            x={barX(t.hour)}
            y={barY(t.count)}
            width={barW}
            height={height}
            rx={Math.min(2, barW / 2)}
            fill="var(--accent)"
            opacity={t.count === 0 ? 0.15 : 0.9}
          />
        );
      })}
      {labelHours.map((hour) => (
        <text
          key={hour}
          x={barX(hour) + barW / 2}
          y={h - 6}
          textAnchor="middle"
          className="fill-[var(--muted)]"
          style={{ fontSize: 9 }}
        >
          {String(hour).padStart(2, "0")}
        </text>
      ))}
    </svg>
  );
}
