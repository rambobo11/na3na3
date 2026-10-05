"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatAvg, formatTime, todayKey } from "@/lib/dates";
import { haptic } from "@/lib/haptics";
import { entriesForDay, filterByKind } from "@/lib/store";
import { SyncBadge } from "@/components/SyncBadge";
import { useAuth } from "@/lib/use-auth";
import { useEntries } from "@/lib/use-entries";
import type { EntryKind } from "@/lib/types";

const LONG_PRESS_MS = 450;

export function HomeScreen() {
  const { configured, user } = useAuth();
  const {
    ready,
    entries,
    today,
    avg7,
    todayCha7et,
    avg7Cha7et,
    add,
    undo,
  } = useEntries();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longKindRef = useRef<EntryKind>("na3");
  const longFiredRef = useRef(false);
  const [popKey, setPopKey] = useState(0);
  const [pulsing, setPulsing] = useState<"na3" | "cha7et" | null>(null);
  const [flashKey, setFlashKey] = useState(0);

  const lastNa3 = useMemo(() => {
    if (!ready) return null;
    const day = entriesForDay(filterByKind(entries, "na3"), todayKey());
    if (day.length === 0) return null;
    return day[day.length - 1];
  }, [ready, entries]);

  const lastCha7et = useMemo(() => {
    if (!ready) return null;
    const day = entriesForDay(filterByKind(entries, "cha7et"), todayKey());
    if (day.length === 0) return null;
    return day[day.length - 1];
  }, [ready, entries]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const bumpFeedback = useCallback(
    (style: "medium" | "heavy", kind: EntryKind) => {
      haptic(style);
      setPopKey((k) => k + 1);
      setPulsing(null);
      requestAnimationFrame(() => setPulsing(kind));
      setFlashKey((k) => k + 1);
    },
    [],
  );

  const onPlusDown = useCallback(
    (kind: EntryKind) => (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      longFiredRef.current = false;
      longKindRef.current = kind;
      clearTimer();
      timerRef.current = setTimeout(() => {
        longFiredRef.current = true;
        add(5, kind);
        bumpFeedback("heavy", kind);
      }, LONG_PRESS_MS);
    },
    [add, bumpFeedback],
  );

  const onPlusUp = useCallback(
    (kind: EntryKind) => (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      clearTimer();
      if (longFiredRef.current) return;
      add(1, kind);
      bumpFeedback("medium", kind);
    },
    [add, bumpFeedback],
  );

  const onPlusCancel = useCallback(() => {
    clearTimer();
  }, []);

  const onMinus = useCallback(
    (kind: EntryKind) => {
      undo(kind);
      haptic("light");
      setPopKey((k) => k + 1);
    },
    [undo],
  );

  const canUndoNa3 =
    ready && filterByKind(entries, "na3").length > 0;
  const canUndoCha7et =
    ready && filterByKind(entries, "cha7et").length > 0;

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
        ) : (
          <SyncBadge compact />
        )}
      </header>

      {configured && !user ? (
        <Link
          href="/account"
          className="mt-4 block rounded-2xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]"
        >
          Create an account in{" "}
          <span className="font-medium text-[var(--fg)]">Login</span> (bottom
          tab) — same password syncs Mac and iPhone.
        </Link>
      ) : null}

      <main className="flex flex-1 flex-col items-center justify-center gap-8">
        <div
          key={popKey}
          className={`grid w-full max-w-sm grid-cols-2 gap-4 ${popKey > 0 ? "na3-count-pop" : ""}`}
        >
          <div className="flex flex-col items-center gap-1">
            <p
              className="font-[family-name:var(--font-display)] text-[clamp(3.2rem,16vw,6rem)] leading-none font-semibold tabular-nums tracking-tight text-[var(--fg)]"
              aria-live="polite"
              aria-label={`Na3Na3 today: ${ready ? today : "…"}`}
            >
              {ready ? today : "—"}
            </p>
            <p className="text-xs uppercase tracking-wider text-[var(--accent)]">
              Na3Na3
            </p>
            <p className="text-xs text-[var(--muted)]">
              avg {ready ? formatAvg(avg7) : "—"}
            </p>
            <p className="text-xs tabular-nums text-[var(--muted)]">
              {lastNa3
                ? `last ${formatTime(lastNa3.loggedAt)}`
                : ready
                  ? "no log yet"
                  : "—"}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p
              className="font-[family-name:var(--font-display)] text-[clamp(3.2rem,16vw,6rem)] leading-none font-semibold tabular-nums tracking-tight text-[var(--cha7et)]"
              aria-live="polite"
              aria-label={`cha7et today: ${ready ? todayCha7et : "…"}`}
            >
              {ready ? todayCha7et : "—"}
            </p>
            <p className="text-xs uppercase tracking-wider text-[var(--cha7et)]">
              cha7et
            </p>
            <p className="text-xs text-[var(--muted)]">
              avg {ready ? formatAvg(avg7Cha7et) : "—"}
            </p>
            <p className="text-xs tabular-nums text-[var(--muted)]">
              {lastCha7et
                ? `last ${formatTime(lastCha7et.loggedAt)}`
                : ready
                  ? "no log yet"
                  : "—"}
            </p>
          </div>
        </div>

        <div className="flex items-end justify-center gap-8">
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              aria-label="Add Na3Na3. Long press to add five."
              onPointerDown={onPlusDown("na3")}
              onPointerUp={onPlusUp("na3")}
              onPointerLeave={onPlusCancel}
              onPointerCancel={onPlusCancel}
              onContextMenu={(e) => e.preventDefault()}
              onAnimationEnd={() => setPulsing(null)}
              className={`select-none touch-manipulation flex h-40 w-40 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)] shadow-[0_12px_40px_var(--accent-glow)] ${pulsing === "na3" ? "na3-btn-pulse" : ""}`}
            >
              <span className="font-[family-name:var(--font-display)] text-5xl font-semibold leading-none">
                +1
              </span>
            </button>
            <button
              type="button"
              aria-label="Undo last Na3Na3"
              onClick={() => onMinus("na3")}
              disabled={!canUndoNa3}
              className="select-none touch-manipulation min-h-12 rounded-full border border-[var(--border)] px-8 py-3 text-base text-[var(--muted)] transition-colors enabled:active:bg-[var(--surface)] disabled:opacity-30"
            >
              −1
            </button>
          </div>

          <div className="flex flex-col items-center gap-4 pb-2">
            <button
              type="button"
              aria-label="Add cha7et. Long press to add five."
              onPointerDown={onPlusDown("cha7et")}
              onPointerUp={onPlusUp("cha7et")}
              onPointerLeave={onPlusCancel}
              onPointerCancel={onPlusCancel}
              onContextMenu={(e) => e.preventDefault()}
              onAnimationEnd={() => setPulsing(null)}
              className={`select-none touch-manipulation flex h-28 w-28 items-center justify-center rounded-full bg-[var(--cha7et)] text-[var(--cha7et-fg)] shadow-[0_10px_32px_var(--cha7et-glow)] ${pulsing === "cha7et" ? "na3-btn-pulse" : ""}`}
            >
              <span className="font-[family-name:var(--font-display)] text-3xl font-semibold leading-none">
                +1
              </span>
            </button>
            <button
              type="button"
              aria-label="Undo last cha7et"
              onClick={() => onMinus("cha7et")}
              disabled={!canUndoCha7et}
              className="select-none touch-manipulation min-h-11 rounded-full border border-[var(--cha7et)]/40 px-6 py-2.5 text-sm text-[var(--cha7et)] transition-colors enabled:active:bg-[var(--surface)] disabled:opacity-30"
            >
              −1
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
