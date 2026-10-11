import type { EntryKind } from "./types";

const GOALS_KEY = "na3na3:daily-goals";

export type DailyGoals = {
  /** Max joints (Na3Na3) per Paris day. null = no limit. */
  na3: number | null;
  /** Max cigarettes (cha7et) per Paris day. null = no limit. */
  cha7et: number | null;
};

export type GoalStatus = "none" | "ok" | "near" | "at" | "over";

const DEFAULT_GOALS: DailyGoals = { na3: null, cha7et: null };

export function loadGoals(): DailyGoals {
  if (typeof window === "undefined") return DEFAULT_GOALS;
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (!raw) return DEFAULT_GOALS;
    const parsed = JSON.parse(raw) as Partial<DailyGoals>;
    return {
      na3: normalizeMax(parsed.na3),
      cha7et: normalizeMax(parsed.cha7et),
    };
  } catch {
    return DEFAULT_GOALS;
  }
}

export function saveGoals(goals: DailyGoals): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    GOALS_KEY,
    JSON.stringify({
      na3: normalizeMax(goals.na3),
      cha7et: normalizeMax(goals.cha7et),
    }),
  );
}

function normalizeMax(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(99, Math.floor(n));
}

export function goalForKind(goals: DailyGoals, kind: EntryKind): number | null {
  return kind === "cha7et" ? goals.cha7et : goals.na3;
}

/** Near = last 20% of the budget (at least 1 before the max). */
export function goalStatus(count: number, max: number | null): GoalStatus {
  if (max === null) return "none";
  if (count > max) return "over";
  if (count === max) return "at";
  if (max <= 0) return count > 0 ? "over" : "at";
  const nearFrom = Math.max(0, max - Math.max(1, Math.ceil(max * 0.2)));
  if (count >= nearFrom) return "near";
  return "ok";
}

export function goalLabel(kind: EntryKind): string {
  return kind === "cha7et" ? "cig." : "joints";
}

export function statusMessage(
  kind: EntryKind,
  count: number,
  max: number,
  status: GoalStatus,
): string | null {
  const label = goalLabel(kind);
  if (status === "over") {
    return `Objectif ${label} dépassé · ${count}/${max}`;
  }
  if (status === "at") {
    return `Objectif ${label} atteint · ${count}/${max}`;
  }
  if (status === "near") {
    return `Plus que ${max - count} ${label} avant l’objectif`;
  }
  return null;
}
