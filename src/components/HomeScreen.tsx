"use client";

import { useCallback, useRef } from "react";
import { formatAvg } from "@/lib/dates";
import { haptic } from "@/lib/haptics";
import { useEntries } from "@/lib/use-entries";

const LONG_PRESS_MS = 450;

export function HomeScreen() {
  const { ready, entries, today, avg7, add, undo } = useEntries();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFiredRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const onPlusDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      longFiredRef.current = false;
      clearTimer();
      timerRef.current = setTimeout(() => {
        longFiredRef.current = true;
        add(5);
        haptic("heavy");
      }, LONG_PRESS_MS);
    },
    [add],
  );

  const onPlusUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      clearTimer();
      if (longFiredRef.current) return;
      add(1);
      haptic("medium");
    },
    [add],
  );

  const onPlusCancel = useCallback(() => {
    clearTimer();
  }, []);

  const onMinus = useCallback(() => {
    undo();
    haptic("light");
  }, [undo]);

  return (
    <div className="relative flex min-h-[100dvh] flex-col px-6 pb-24 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="flex items-baseline justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--fg)]">
          Na3Na3
        </h1>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-10">
        <div className="flex flex-col items-center gap-2">
          <p
            className="font-[family-name:var(--font-display)] text-[7.5rem] leading-none font-semibold tabular-nums tracking-tight text-[var(--fg)] sm:text-[8.5rem]"
            aria-live="polite"
            aria-label={`Today: ${ready ? today : "…"}`}
          >
            {ready ? today : "—"}
          </p>
          <p className="text-sm text-[var(--muted)]">
            7-day avg {ready ? formatAvg(avg7) : "—"}
          </p>
        </div>

        <button
          type="button"
          aria-label="Add one. Long press to add five."
          onPointerDown={onPlusDown}
          onPointerUp={onPlusUp}
          onPointerLeave={onPlusCancel}
          onPointerCancel={onPlusCancel}
          onContextMenu={(e) => e.preventDefault()}
          className="select-none touch-manipulation active:scale-[0.97] transition-transform duration-100 flex h-36 w-36 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)] shadow-[0_12px_40px_var(--accent-glow)] sm:h-40 sm:w-40"
        >
          <span className="font-[family-name:var(--font-display)] text-5xl font-semibold leading-none">
            +1
          </span>
        </button>

        <button
          type="button"
          aria-label="Undo last"
          onClick={onMinus}
          disabled={!ready || entries.length === 0}
          className="select-none touch-manipulation rounded-full border border-[var(--border)] px-8 py-3 text-base text-[var(--muted)] transition-colors enabled:hover:border-[var(--fg-soft)] enabled:hover:text-[var(--fg)] disabled:opacity-30"
        >
          −1
        </button>
      </main>
    </div>
  );
}
