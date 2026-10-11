"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { GoalsEditor } from "@/components/GoalsEditor";
import { SyncBadge } from "@/components/SyncBadge";
import {
  formatEuro,
  moneyForCha7et,
  moneyForNa3,
  moneyTotal,
} from "@/lib/costs";
import { formatAvg, formatTime, todayKey } from "@/lib/dates";
import {
  goalForKind,
  goalStatus,
  loadGoals,
  statusMessage,
  type DailyGoals,
  type GoalStatus,
} from "@/lib/goals";
import { haptic } from "@/lib/haptics";
import {
  currentSmokeFreeStreak,
  entriesForDay,
  filterByKind,
} from "@/lib/store";
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
  const [goals, setGoals] = useState<DailyGoals>({ na3: null, cha7et: null });
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [goalBanner, setGoalBanner] = useState<string | null>(null);

  useEffect(() => {
    setGoals(loadGoals());
  }, []);

  useEffect(() => {
    if (!goalBanner) return;
    const t = window.setTimeout(() => setGoalBanner(null), 4200);
    return () => window.clearTimeout(t);
  }, [goalBanner]);

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

  const freeStreak = useMemo(
    () => (ready ? currentSmokeFreeStreak(entries) : 0),
    [ready, entries],
  );

  const statusNa3 = goalStatus(today, goals.na3);
  const statusCha7et = goalStatus(todayCha7et, goals.cha7et);

  const suggestNa3 = Math.max(1, Math.floor(avg7) || 2);
  const suggestCha7et = Math.max(1, Math.floor(avg7Cha7et) || 4);

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

  const applyAdd = useCallback(
    (count: number, kind: EntryKind) => {
      const before = kind === "cha7et" ? todayCha7et : today;
      const max = goalForKind(goals, kind);
      add(count, kind);
      const after = before + count;
      const status = goalStatus(after, max);
      const msg =
        max !== null ? statusMessage(kind, after, max, status) : null;

      if (status === "over" || status === "at") {
        bumpFeedback("heavy", kind);
        if (msg) setGoalBanner(msg);
      } else if (status === "near") {
        bumpFeedback("medium", kind);
        if (msg) setGoalBanner(msg);
      } else {
        bumpFeedback(count >= 5 ? "heavy" : "medium", kind);
      }
    },
    [add, bumpFeedback, goals, today, todayCha7et],
  );

  const onPlusDown = useCallback(
    (kind: EntryKind) => (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      longFiredRef.current = false;
      clearTimer();
      timerRef.current = setTimeout(() => {
        longFiredRef.current = true;
        applyAdd(5, kind);
      }, LONG_PRESS_MS);
    },
    [applyAdd],
  );

  const onPlusUp = useCallback(
    (kind: EntryKind) => (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      clearTimer();
      if (longFiredRef.current) return;
      applyAdd(1, kind);
    },
    [applyAdd],
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
      setGoalBanner(null);
    },
    [undo],
  );

  const canUndoNa3 = ready && filterByKind(entries, "na3").length > 0;
  const canUndoCha7et = ready && filterByKind(entries, "cha7et").length > 0;
  const hasAnyGoal = goals.na3 !== null || goals.cha7et !== null;

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

      {goalBanner ? (
        <div
          className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--fg)]"
          role="status"
        >
          {goalBanner}
        </div>
      ) : null}

      <main className="flex flex-1 flex-col items-center justify-center gap-5">
        <div className="grid w-full max-w-sm grid-cols-2 gap-x-5">
          <CountColumn
            kind="na3"
            count={ready ? today : null}
            avg={ready ? formatAvg(avg7) : "—"}
            last={
              lastNa3
                ? `last ${formatTime(lastNa3.loggedAt)}`
                : ready
                  ? "no log yet"
                  : "—"
            }
            money={ready ? formatEuro(moneyForNa3(today)) : "—"}
            unitPrice="2,50 €"
            title="Na3Na3 · joints"
            tone="na3"
            pop={popKind === "na3" && popKey > 0}
            popKey={popKey}
            goalMax={goals.na3}
            status={statusNa3}
          />
          <CountColumn
            kind="cha7et"
            count={ready ? todayCha7et : null}
            avg={ready ? formatAvg(avg7Cha7et) : "—"}
            last={
              lastCha7et
                ? `last ${formatTime(lastCha7et.loggedAt)}`
                : ready
                  ? "no log yet"
                  : "—"
            }
            money={ready ? formatEuro(moneyForCha7et(todayCha7et)) : "—"}
            unitPrice="0,18 €"
            title="cha7et · cig."
            tone="cha7et"
            pop={popKind === "cha7et" && popKey > 0}
            popKey={popKey}
            goalMax={goals.cha7et}
            status={statusCha7et}
          />
        </div>

        <button
          type="button"
          onClick={() => setGoalsOpen(true)}
          className="w-full max-w-sm rounded-2xl border border-[var(--border)] px-4 py-3 text-left transition-colors active:bg-[var(--surface)]"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                Objectif du jour
              </p>
              <p className="mt-1 text-sm text-[var(--fg)]">
                {hasAnyGoal ? (
                  <>
                    <span className="text-[var(--accent)]">
                      {goals.na3 !== null
                        ? `${today}/${goals.na3} joints`
                        : "joints off"}
                    </span>
                    {" · "}
                    <span className="text-[var(--cha7et)]">
                      {goals.cha7et !== null
                        ? `${todayCha7et}/${goals.cha7et} cig.`
                        : "cig. off"}
                    </span>
                  </>
                ) : (
                  "Définir un plafond pour t’aider à réduire"
                )}
              </p>
            </div>
            <span className="shrink-0 text-sm text-[var(--muted)]">Éditer</span>
          </div>
        </button>

        {ready && freeStreak > 0 ? (
          <div className="w-full max-w-sm text-center">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--accent)]">
              jours sans
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold tabular-nums tracking-tight text-[var(--accent)]">
              {freeStreak}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {freeStreak === 1
                ? "1 jour sans joint ni cigarette"
                : `${freeStreak} jours sans joint ni cigarette`}
            </p>
          </div>
        ) : null}

        <div className="w-full max-w-sm text-center">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            perdu aujourd’hui
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums tracking-tight text-[var(--fg)]">
            {ready ? formatEuro(moneyTotal(today, todayCha7et)) : "—"}
          </p>
          <p className="mt-1 text-xs tabular-nums text-[var(--muted)]">
            <span className="text-[var(--accent)]">
              {ready ? formatEuro(moneyForNa3(today)) : "—"} joints
            </span>
            {" + "}
            <span className="text-[var(--cha7et)]">
              {ready ? formatEuro(moneyForCha7et(todayCha7et)) : "—"} cig.
            </span>
          </p>
        </div>

        <div className="grid w-full max-w-sm grid-cols-2 items-end gap-x-5">
          <div className="flex flex-col items-center">
            <button
              type="button"
              aria-label="Add joint (Na3Na3). Long press to add five."
              onPointerDown={onPlusDown("na3")}
              onPointerUp={onPlusUp("na3")}
              onPointerLeave={onPlusCancel}
              onPointerCancel={onPlusCancel}
              onContextMenu={(e) => e.preventDefault()}
              onAnimationEnd={() => setPulsing(null)}
              className={`select-none touch-manipulation flex h-[9.5rem] w-[9.5rem] items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)] shadow-[0_14px_44px_var(--accent-glow)] ${
                pulsing === "na3" ? "na3-btn-pulse" : ""
              } ${
                statusNa3 === "over"
                  ? "ring-2 ring-[var(--fg)] ring-offset-2 ring-offset-[var(--bg)]"
                  : ""
              }`}
            >
              <span className="font-[family-name:var(--font-display)] text-5xl font-semibold leading-none">
                +1
              </span>
            </button>
            <button
              type="button"
              aria-label="Undo last joint"
              onClick={() => onMinus("na3")}
              disabled={!canUndoNa3}
              className="mt-4 select-none touch-manipulation min-h-11 rounded-full border border-[var(--border)] px-7 py-2.5 text-[15px] text-[var(--muted)] transition-colors enabled:active:bg-[var(--surface)] disabled:opacity-30"
            >
              −1
            </button>
          </div>

          <div className="flex flex-col items-center pb-1">
            <button
              type="button"
              aria-label="Add cigarette (cha7et). Long press to add five."
              onPointerDown={onPlusDown("cha7et")}
              onPointerUp={onPlusUp("cha7et")}
              onPointerLeave={onPlusCancel}
              onPointerCancel={onPlusCancel}
              onContextMenu={(e) => e.preventDefault()}
              onAnimationEnd={() => setPulsing(null)}
              className={`select-none touch-manipulation flex h-[6.75rem] w-[6.75rem] items-center justify-center rounded-full bg-[var(--cha7et)] text-[var(--cha7et-fg)] shadow-[0_12px_36px_var(--cha7et-glow)] ${
                pulsing === "cha7et" ? "na3-btn-pulse-cha7et" : ""
              } ${
                statusCha7et === "over"
                  ? "ring-2 ring-[var(--fg)] ring-offset-2 ring-offset-[var(--bg)]"
                  : ""
              }`}
            >
              <span className="font-[family-name:var(--font-display)] text-[2rem] font-semibold leading-none">
                +1
              </span>
            </button>
            <button
              type="button"
              aria-label="Undo last cigarette"
              onClick={() => onMinus("cha7et")}
              disabled={!canUndoCha7et}
              className="mt-4 select-none touch-manipulation min-h-11 rounded-full border border-[var(--cha7et)]/40 px-7 py-2.5 text-[15px] text-[var(--cha7et)] transition-colors enabled:active:bg-[var(--surface)] disabled:opacity-30"
            >
              −1
            </button>
          </div>
        </div>
      </main>

      <GoalsEditor
        open={goalsOpen}
        onClose={() => {
          setGoals(loadGoals());
          setGoalsOpen(false);
        }}
        suggestNa3={suggestNa3}
        suggestCha7et={suggestCha7et}
      />
    </div>
  );
}

function CountColumn({
  count,
  avg,
  last,
  money,
  unitPrice,
  title,
  tone,
  pop,
  popKey,
  goalMax,
  status,
}: {
  kind: EntryKind;
  count: number | null;
  avg: string;
  last: string;
  money: string;
  unitPrice: string;
  title: string;
  tone: "na3" | "cha7et";
  pop: boolean;
  popKey: number;
  goalMax: number | null;
  status: GoalStatus;
}) {
  const color = tone === "cha7et" ? "var(--cha7et)" : "var(--accent)";
  const pct =
    goalMax !== null && goalMax > 0 && count !== null
      ? Math.min(100, (count / goalMax) * 100)
      : 0;

  return (
    <div className="flex flex-col items-center">
      <p
        key={pop ? `${tone}-${popKey}` : tone}
        className={`font-[family-name:var(--font-display)] text-[clamp(3.5rem,17vw,5.75rem)] leading-none font-semibold tabular-nums tracking-tight ${
          pop ? "na3-count-pop" : ""
        }`}
        style={{
          color:
            status === "over" || status === "at"
              ? color
              : tone === "cha7et"
                ? "var(--cha7et)"
                : "var(--fg)",
        }}
        aria-live="polite"
      >
        {count === null ? "—" : count}
      </p>
      <p
        className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em]"
        style={{ color }}
      >
        {title}
      </p>

      {goalMax !== null ? (
        <div className="mt-2 w-full max-w-[7.5rem]">
          <div className="flex items-baseline justify-between text-[11px] tabular-nums">
            <span
              className={
                status === "over" || status === "at"
                  ? "font-semibold"
                  : "text-[var(--muted)]"
              }
              style={
                status === "over" || status === "at"
                  ? { color }
                  : undefined
              }
            >
              {count ?? 0}/{goalMax}
            </span>
            <span className="text-[var(--muted)]">
              {status === "over"
                ? "dépassé"
                : status === "at"
                  ? "atteint"
                  : status === "near"
                    ? "proche"
                    : "ok"}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{
                width: `${pct}%`,
                background: color,
                opacity: status === "ok" ? 0.75 : 1,
              }}
            />
          </div>
        </div>
      ) : null}

      <p className="mt-2 text-center text-xs leading-relaxed text-[var(--muted)]">
        avg {avg}
        <br />
        {last}
        <br />
        <span style={{ color }}>
          {money}
          {" · "}
          {unitPrice}
        </span>
      </p>
    </div>
  );
}
