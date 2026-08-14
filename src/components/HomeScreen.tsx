"use client";

import { useCallback, useRef } from "react";
import Link from "next/link";
import { formatAvg } from "@/lib/dates";
import { haptic } from "@/lib/haptics";
import { useAuth } from "@/lib/use-auth";
import { useEntries } from "@/lib/use-entries";

const LONG_PRESS_MS = 450;

export function HomeScreen() {
  const { configured, user } = useAuth();
  const { ready, entries, today, avg7, add, undo, syncStatus } = useEntries();
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
    <div className="app-screen relative flex flex-col">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--fg)]">
          Na3Na3
        </h1>
        {configured && !user ? (
          <Link
            href="/account"
            className="shrink-0 text-sm text-[var(--accent)]"
          >
            Sync
          </Link>
        ) : configured && user && syncStatus === "synced" ? (
          <span className="shrink-0 text-xs text-[var(--muted)]">synced</span>
        ) : null}
      </header>

      {configured && !user ? (
        <p className="mt-3 text-sm text-[var(--muted)]">
          This device is local-only. Open{" "}
          <Link href="/account" className="text-[var(--fg)] underline">
            Sync
          </Link>{" "}
          and enter the email code to pull Mac data.
        </p>
      ) : null}

      <main className="flex flex-1 flex-col items-center justify-center gap-10">
        <div className="flex flex-col items-center gap-2">
          <p
            className="font-[family-name:var(--font-display)] text-[clamp(4.5rem,22vw,8.5rem)] leading-none font-semibold tabular-nums tracking-tight text-[var(--fg)]"
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
          className="select-none touch-manipulation active:scale-[0.97] transition-transform duration-100 flex h-40 w-40 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)] shadow-[0_12px_40px_var(--accent-glow)]"
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
