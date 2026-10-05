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
  const longFiredRef = useRef(false);
  const [popKind, setPopKind] = useState<EntryKind | null>(null);
  const [popKey, setPopKey] = useState(0);
  const [pulsing, setPulsing] = useState<EntryKind | null>(null);
  const [flashKind, setFlashKind] = useState<EntryKind | null>(null);
  const [flashKey, setFlashKey] = useState(0);

  const lastNa3 = useMemo(() => {
    if (!ready) return null;
    const day = entriesForDay(filterByKind(entries, "na3"), todayKey());
    return day.length ? day[day.length - 1] : null;
  }, [ready, entries]);

  const lastCha7et = useMemo(() => {
    if (!ready) return null;
    const day = entriesForDay(filterByKind(entries, "cha7et"), todayKey());
    return day.length ? day[day.length - 1] : null;
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
      setPopKind(kind);
      setPopKey((k) => k + 1);
      setPulsing(null);
      requestAnimationFrame(() => setPulsing(kind));
      setFlashKind(kind);
      setFlashKey((k) => k + 1);
    },
    [],
  );

  const onPlusDown = useCallback(
    (kind: EntryKind) => (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      longFiredRef.current = false;
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
      setPopKind(kind);
      setPopKey((k) => k + 1);
    },
    [undo],
  );

  const canUndoNa3 = ready && filterByKind(entries, "na3").length > 0;
  const canUndoCha7et = ready && filterByKind(entries, "cha7et").length > 0;

  return (
    <div className="app-screen relative flex flex-col">
      {flashKey > 0 && flashKind ? (
        <div
          key={flashKey}
          className={
            flashKind === "cha7et" ? "na3-tap-flash-cha7et" : "na3-tap-flash"
          }
          aria-hidden
        />
      ) : null}

      <header className="flex items-baseline justify-between gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-[1.75rem] font-semibold tracking-tight text-[var(--fg)]">
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
          <span className="font-medium text-[var(--fg)]">Login</span> — same
          password syncs Mac and iPhone.
        </Link>
      ) : null}

      <main className="flex flex-1 flex-col items-center justify-center">
        <div className="grid w-full max-w-sm grid-cols-2 items-end gap-x-5 gap-y-6">
          {/* Na3Na3 lane */}
          <div className="flex flex-col items-center">
            <p
              key={popKind === "na3" ? `n-${popKey}` : "n"}
              className={`font-[family-name:var(--font-display)] text-[clamp(3.5rem,17vw,5.75rem)] leading-none font-semibold tabular-nums tracking-tight text-[var(--fg)] ${
                popKind === "na3" && popKey > 0 ? "na3-count-pop" : ""
              }`}
              aria-live="polite"
              aria-label={`Na3Na3 today: ${ready ? today : "…"}`}
            >
              {ready ? today : "—"}
            </p>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
              Na3Na3
            </p>
            <p className="mt-1 text-center text-xs leading-relaxed text-[var(--muted)]">
              avg {ready ? formatAvg(avg7) : "—"}
              <br />
              {lastNa3
                ? `last ${formatTime(lastNa3.loggedAt)}`
                : ready
                  ? "no log yet"
                  : "—"}
            </p>

            <button
              type="button"
              aria-label="Add Na3Na3. Long press to add five."
              onPointerDown={onPlusDown("na3")}
              onPointerUp={onPlusUp("na3")}
              onPointerLeave={onPlusCancel}
              onPointerCancel={onPlusCancel}
              onContextMenu={(e) => e.preventDefault()}
              onAnimationEnd={() => setPulsing(null)}
              className={`mt-7 select-none touch-manipulation flex h-[9.5rem] w-[9.5rem] items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)] shadow-[0_14px_44px_var(--accent-glow)] ${
                pulsing === "na3" ? "na3-btn-pulse" : ""
              }`}
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
              className="mt-4 select-none touch-manipulation min-h-11 rounded-full border border-[var(--border)] px-7 py-2.5 text-[15px] text-[var(--muted)] transition-colors enabled:active:bg-[var(--surface)] disabled:opacity-30"
            >
              −1
            </button>
          </div>

          {/* cha7et lane */}
          <div className="flex flex-col items-center">
            <p
              key={popKind === "cha7et" ? `c-${popKey}` : "c"}
              className={`font-[family-name:var(--font-display)] text-[clamp(3.5rem,17vw,5.75rem)] leading-none font-semibold tabular-nums tracking-tight text-[var(--cha7et)] ${
                popKind === "cha7et" && popKey > 0 ? "na3-count-pop" : ""
              }`}
              aria-live="polite"
              aria-label={`cha7et today: ${ready ? todayCha7et : "…"}`}
            >
              {ready ? todayCha7et : "—"}
            </p>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--cha7et)]">
              cha7et
            </p>
            <p className="mt-1 text-center text-xs leading-relaxed text-[var(--muted)]">
              avg {ready ? formatAvg(avg7Cha7et) : "—"}
              <br />
              {lastCha7et
                ? `last ${formatTime(lastCha7et.loggedAt)}`
                : ready
                  ? "no log yet"
                  : "—"}
            </p>

            <button
              type="button"
              aria-label="Add cha7et. Long press to add five."
              onPointerDown={onPlusDown("cha7et")}
              onPointerUp={onPlusUp("cha7et")}
              onPointerLeave={onPlusCancel}
              onPointerCancel={onPlusCancel}
              onContextMenu={(e) => e.preventDefault()}
              onAnimationEnd={() => setPulsing(null)}
              className={`mt-7 select-none touch-manipulation flex h-[6.75rem] w-[6.75rem] items-center justify-center rounded-full bg-[var(--cha7et)] text-[var(--cha7et-fg)] shadow-[0_12px_36px_var(--cha7et-glow)] ${
                pulsing === "cha7et" ? "na3-btn-pulse-cha7et" : ""
              }`}
            >
              <span className="font-[family-name:var(--font-display)] text-[2rem] font-semibold leading-none">
                +1
              </span>
            </button>

            <button
              type="button"
              aria-label="Undo last cha7et"
              onClick={() => onMinus("cha7et")}
              disabled={!canUndoCha7et}
              className="mt-4 select-none touch-manipulation min-h-11 rounded-full border border-[var(--cha7et)]/40 px-7 py-2.5 text-[15px] text-[var(--cha7et)] transition-colors enabled:active:bg-[var(--surface)] disabled:opacity-30"
            >
              −1
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
