"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { GoalsEditor } from "@/components/GoalsEditor";
import { SyncBadge } from "@/components/SyncBadge";
import {
  formatEuro,
  moneyForCha7et,
  moneyForNa3,
  moneySavedDuringStreak,
  moneyTotal,
} from "@/lib/costs";
import { formatTime, todayKey } from "@/lib/dates";
import {
  goalForKind,
  goalStatus,
  loadGoals,
  saveGoals,
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
import { homeTip, suggestedCeilings } from "@/lib/tips";
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
  const moneySavedStreak = useMemo(
    () =>
      ready ? moneySavedDuringStreak(freeStreak, avg7, avg7Cha7et) : 0,
    [ready, freeStreak, avg7, avg7Cha7et],
  );
  const moneyToday = useMemo(
    () => (ready ? moneyTotal(today, todayCha7et) : 0),
    [ready, today, todayCha7et],
  );

  const statusNa3 = goalStatus(today, goals.na3);
  const statusCha7et = goalStatus(todayCha7et, goals.cha7et);
  const hasAnyGoal = goals.na3 !== null || goals.cha7et !== null;
  const suggest = suggestedCeilings(avg7, avg7Cha7et);

  const tip = useMemo(() => {
    if (!ready || goalBanner) return null;
    return homeTip({
      freeStreak,
      moneySavedStreak,
      moneyToday,
      avg7Na3: avg7,
      avg7Cha7et,
      statusNa3,
      statusCha7et,
      hasGoals: hasAnyGoal,
      todayTotal: today + todayCha7et,
      roomNa3: goals.na3 !== null ? Math.max(0, goals.na3 - today) : null,
      roomCha7et:
        goals.cha7et !== null ? Math.max(0, goals.cha7et - todayCha7et) : null,
    });
  }, [
    ready,
    goalBanner,
    freeStreak,
    moneySavedStreak,
    moneyToday,
    avg7,
    avg7Cha7et,
    statusNa3,
    statusCha7et,
    hasAnyGoal,
    today,
    todayCha7et,
    goals.na3,
    goals.cha7et,
  ]);

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

  function applyReduceOne() {
    const next = {
      na3: suggest.na3,
      cha7et: suggest.cha7et,
    };
    saveGoals(next);
    setGoals(next);
    haptic("medium");
    setGoalBanner(
      `Objectif réglé · max ${next.na3} joints / ${next.cha7et} cig. (moy. −1)`,
    );
  }

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
          className="mt-3 block rounded-2xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]"
        >
          Crée un compte dans{" "}
          <span className="font-medium text-[var(--fg)]">Login</span> pour
          sync Mac ↔ iPhone.
        </Link>
      ) : null}

      {goalBanner ? (
        <div
          className="mt-3 rounded-2xl bg-[var(--surface)] px-4 py-3 text-sm text-[var(--fg)]"
          role="status"
        >
          {goalBanner}
        </div>
      ) : null}

      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-5 py-3">
        {/* 1. Counts + actions */}
        <section className="grid grid-cols-2 gap-x-5">
          <TapLane
            tone="na3"
            title="joints"
            count={ready ? today : null}
            money={ready ? formatEuro(moneyForNa3(today)) : null}
            last={lastNa3 ? formatTime(lastNa3.loggedAt) : null}
            goalMax={goals.na3}
            status={statusNa3}
            pop={popKind === "na3" && popKey > 0}
            popKey={popKey}
            pulsing={pulsing === "na3"}
            canUndo={canUndoNa3}
            btnClass="h-[8.5rem] w-[8.5rem] text-5xl"
            onPlusDown={onPlusDown("na3")}
            onPlusUp={onPlusUp("na3")}
            onPlusCancel={onPlusCancel}
            onMinus={() => onMinus("na3")}
            onPulseEnd={() => setPulsing(null)}
          />
          <TapLane
            tone="cha7et"
            title="cig."
            count={ready ? todayCha7et : null}
            money={ready ? formatEuro(moneyForCha7et(todayCha7et)) : null}
            last={lastCha7et ? formatTime(lastCha7et.loggedAt) : null}
            goalMax={goals.cha7et}
            status={statusCha7et}
            pop={popKind === "cha7et" && popKey > 0}
            popKey={popKey}
            pulsing={pulsing === "cha7et"}
            canUndo={canUndoCha7et}
            btnClass="h-[6rem] w-[6rem] text-[1.75rem]"
            onPlusDown={onPlusDown("cha7et")}
            onPlusUp={onPlusUp("cha7et")}
            onPlusCancel={onPlusCancel}
            onMinus={() => onMinus("cha7et")}
            onPulseEnd={() => setPulsing(null)}
          />
        </section>

        {/* 2. Streak / money — one glance */}
        <section className="grid grid-cols-3 gap-1.5 text-center">
          <Insight
            label="sans"
            value={ready ? String(freeStreak) : "—"}
            hint="jours"
            emphasize={freeStreak > 0}
          />
          <Insight
            label="économisé"
            value={
              ready && freeStreak > 0
                ? formatEuro(moneySavedStreak)
                : formatEuro(0)
            }
            hint="streak"
            emphasize={moneySavedStreak > 0}
          />
          <Insight
            label="perdu"
            value={ready ? formatEuro(moneyToday) : "—"}
            hint="aujourd’hui"
          />
        </section>

        {/* 3. Goal row (single surface) */}
        <section>
          <button
            type="button"
            onClick={() => setGoalsOpen(true)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[var(--surface)]/70 px-4 py-2.5 text-left active:opacity-80"
          >
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                Objectif
              </p>
              <p className="mt-0.5 truncate text-sm text-[var(--fg)]">
                {hasAnyGoal ? (
                  <>
                    <span className="text-[var(--accent)]">
                      {goals.na3 !== null ? `${today}/${goals.na3}` : "—"}
                    </span>
                    {" · "}
                    <span className="text-[var(--cha7et)]">
                      {goals.cha7et !== null
                        ? `${todayCha7et}/${goals.cha7et}`
                        : "—"}
                    </span>
                  </>
                ) : (
                  "Pas encore de plafond"
                )}
              </p>
            </div>
            <span className="shrink-0 text-sm text-[var(--muted)]">Éditer</span>
          </button>

          {!hasAnyGoal && ready && (avg7 > 0 || avg7Cha7et > 0) ? (
            <button
              type="button"
              onClick={applyReduceOne}
              className="mt-1.5 w-full rounded-2xl px-4 py-2 text-sm text-[var(--muted)] underline-offset-2 active:bg-[var(--surface)] active:text-[var(--fg)]"
            >
              Viser moyenne −1 · {suggest.na3} / {suggest.cha7et}
            </button>
          ) : null}
        </section>

        {/* 4. One tip — hidden while banner talks */}
        {tip ? (
          <p className="px-1 text-center text-[13px] leading-snug text-[var(--muted)]">
            {tip}
          </p>
        ) : null}
      </main>

      <GoalsEditor
        open={goalsOpen}
        onClose={() => {
          setGoals(loadGoals());
          setGoalsOpen(false);
        }}
        suggestNa3={Math.max(0, suggest.na3)}
        suggestCha7et={Math.max(0, suggest.cha7et)}
      />
    </div>
  );
}

function Insight({
  label,
  value,
  hint,
  emphasize,
}: {
  label: string;
  value: string;
  hint: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[var(--surface)]/55 px-2 py-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
      <p
        className={`mt-1 font-[family-name:var(--font-display)] text-lg font-semibold tabular-nums tracking-tight ${
          emphasize ? "text-[var(--accent)]" : "text-[var(--fg)]"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-[var(--muted)]">{hint}</p>
    </div>
  );
}

function TapLane({
  tone,
  title,
  count,
  money,
  last,
  goalMax,
  status,
  pop,
  popKey,
  pulsing,
  canUndo,
  btnClass,
  onPlusDown,
  onPlusUp,
  onPlusCancel,
  onMinus,
  onPulseEnd,
}: {
  tone: "na3" | "cha7et";
  title: string;
  count: number | null;
  money: string | null;
  last: string | null;
  goalMax: number | null;
  status: GoalStatus;
  pop: boolean;
  popKey: number;
  pulsing: boolean;
  canUndo: boolean;
  btnClass: string;
  onPlusDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPlusUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPlusCancel: () => void;
  onMinus: () => void;
  onPulseEnd: () => void;
}) {
  const color = tone === "cha7et" ? "var(--cha7et)" : "var(--accent)";
  const fg = tone === "cha7et" ? "var(--cha7et-fg)" : "var(--accent-fg)";
  const glow =
    tone === "cha7et" ? "var(--cha7et-glow)" : "var(--accent-glow)";
  const pulseClass =
    tone === "cha7et" ? "na3-btn-pulse-cha7et" : "na3-btn-pulse";
  const pct =
    goalMax !== null && goalMax > 0 && count !== null
      ? Math.min(100, (count / goalMax) * 100)
      : goalMax === 0 && count !== null
        ? count > 0
          ? 100
          : 0
        : 0;

  return (
    <div className="flex flex-col items-center">
      <p
        key={pop ? `${tone}-${popKey}` : tone}
        className={`font-[family-name:var(--font-display)] text-[clamp(3rem,15vw,4.75rem)] leading-none font-semibold tabular-nums tracking-tight ${
          pop ? "na3-count-pop" : ""
        }`}
        style={{ color }}
        aria-live="polite"
      >
        {count === null ? "—" : count}
      </p>
      <p
        className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.14em]"
        style={{ color }}
      >
        {title}
      </p>

      {goalMax !== null ? (
        <div className="mt-2 w-full max-w-[6.5rem]">
          <div className="flex justify-between text-[11px] tabular-nums text-[var(--muted)]">
            <span style={{ color: status === "ok" ? undefined : color }}>
              {count ?? 0}/{goalMax}
            </span>
            <span>
              {status === "over"
                ? "!"
                : status === "at"
                  ? "="
                  : status === "near"
                    ? "…"
                    : ""}
            </span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--border)]/60">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${pct}%`, background: color }}
            />
          </div>
        </div>
      ) : null}

      <p className="mt-1.5 text-[11px] tabular-nums text-[var(--muted)]">
        {money ?? "—"}
        {last ? ` · ${last}` : ""}
      </p>

      <button
        type="button"
        aria-label={
          tone === "cha7et"
            ? "Add cigarette. Long press +5."
            : "Add joint. Long press +5."
        }
        onPointerDown={onPlusDown}
        onPointerUp={onPlusUp}
        onPointerLeave={onPlusCancel}
        onPointerCancel={onPlusCancel}
        onContextMenu={(e) => e.preventDefault()}
        onAnimationEnd={onPulseEnd}
        className={`mt-5 select-none touch-manipulation flex items-center justify-center rounded-full font-[family-name:var(--font-display)] font-semibold leading-none ${btnClass} ${
          pulsing ? pulseClass : ""
        } ${
          status === "over"
            ? "ring-2 ring-[var(--fg)] ring-offset-2 ring-offset-[var(--bg)]"
            : ""
        }`}
        style={{
          background: color,
          color: fg,
          boxShadow: `0 12px 36px ${glow}`,
        }}
      >
        +1
      </button>

      <button
        type="button"
        aria-label="Undo last"
        onClick={onMinus}
        disabled={!canUndo}
        className="mt-3 select-none touch-manipulation min-h-10 rounded-full border border-[var(--border)] px-6 py-2 text-sm text-[var(--muted)] enabled:active:bg-[var(--surface)] disabled:opacity-30"
      >
        −1
      </button>
    </div>
  );
}
