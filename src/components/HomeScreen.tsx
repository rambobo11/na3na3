"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatAvg, formatTime, todayKey } from "@/lib/dates";
import { haptic } from "@/lib/haptics";
import { entriesForDay } from "@/lib/store";
import { useAuth } from "@/lib/use-auth";
import { useEntries } from "@/lib/use-entries";

const LONG_PRESS_MS = 450;

export function HomeScreen() {
  const { configured, user } = useAuth();
  const { ready, entries, today, avg7, add, undo, syncStatus } = useEntries();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFiredRef = useRef(false);
  const [popKey, setPopKey] = useState(0);
  const [pulsing, setPulsing] = useState(false);
  const [flashKey, setFlashKey] = useState(0);

  const lastToday = useMemo(() => {
    if (!ready) return null;
    const day = entriesForDay(entries, todayKey());
    if (day.length === 0) return null;
    return day[day.length - 1];
  }, [ready, entries]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const bumpFeedback = useCallback((style: "medium" | "heavy") => {
    haptic(style);
    setPopKey((k) => k + 1);
    setPulsing(false);
    // Restart CSS animation on next frame
    requestAnimationFrame(() => setPulsing(true));
    setFlashKey((k) => k + 1);
  }, []);

  const onPlusDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      longFiredRef.current = false;
      clearTimer();
      timerRef.current = setTimeout(() => {
        longFiredRef.current = true;
        add(5);
        bumpFeedback("heavy");
      }, LONG_PRESS_MS);
    },
    [add, bumpFeedback],
  );

  const onPlusUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      clearTimer();
      if (longFiredRef.current) return;
      add(1);
      bumpFeedback("medium");
    },
    [add, bumpFeedback],
  );

  const onPlusCancel = useCallback(() => {
    clearTimer();
  }, []);

  const onMinus = useCallback(() => {
    undo();
    haptic("light");
    setPopKey((k) => k + 1);
  }, [undo]);

  return (
    <div className="app-screen relative flex flex-col">
      {flashKey > 0 ? (
        <div key={flashKey} className="na3-tap-flash" aria-hidden />
      ) : null}

      <header className="flex items-baseline justify-between gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--fg)]">
          Na3Na3
        </h1>
        {configured && !user ? (
          <Link
            href="/account"
            className="shrink-0 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-fg)]"
          >
            Login
          </Link>
        ) : configured && user && syncStatus === "synced" ? (
          <span className="shrink-0 text-xs text-[var(--muted)]">synced</span>
        ) : null}
      </header>

      {configured && !user ? (
        <Link
          href="/account"
          className="mt-4 block rounded-2xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]"
        >
          Put your email in{" "}
          <span className="font-medium text-[var(--fg)]">Login</span> (bottom
          tab) to sync with Mac.
        </Link>
      ) : null}

      <main className="flex flex-1 flex-col items-center justify-center gap-10">
        <div className="flex flex-col items-center gap-2">
          <p
            key={popKey}
            className={`font-[family-name:var(--font-display)] text-[clamp(4.5rem,22vw,8.5rem)] leading-none font-semibold tabular-nums tracking-tight text-[var(--fg)] ${popKey > 0 ? "na3-count-pop" : ""}`}
            aria-live="polite"
            aria-label={`Today: ${ready ? today : "…"}`}
          >
            {ready ? today : "—"}
          </p>
          <p className="text-sm text-[var(--muted)]">
            7-day avg {ready ? formatAvg(avg7) : "—"}
          </p>
          <p className="text-sm tabular-nums text-[var(--muted)]">
            {lastToday
              ? `last ${formatTime(lastToday.loggedAt)}`
              : ready
                ? "no log yet today"
                : "—"}
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
          onAnimationEnd={() => setPulsing(false)}
          className={`select-none touch-manipulation flex h-40 w-40 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)] shadow-[0_12px_40px_var(--accent-glow)] ${pulsing ? "na3-btn-pulse" : ""}`}
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
          className="select-none touch-manipulation min-h-12 rounded-full border border-[var(--border)] px-10 py-3.5 text-base text-[var(--muted)] transition-colors enabled:active:bg-[var(--surface)] disabled:opacity-30"
        >
          −1
        </button>
      </main>
    </div>
  );
}
