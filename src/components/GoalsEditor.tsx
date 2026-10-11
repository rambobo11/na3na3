"use client";

import { useEffect, useState } from "react";
import {
  loadGoals,
  saveGoals,
  type DailyGoals,
} from "@/lib/goals";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Suggested defaults from recent averages (floored, min 1). */
  suggestNa3?: number;
  suggestCha7et?: number;
};

export function GoalsEditor({
  open,
  onClose,
  suggestNa3,
  suggestCha7et,
}: Props) {
  const [draft, setDraft] = useState<DailyGoals>(() => loadGoals());

  useEffect(() => {
    if (open) setDraft(loadGoals());
  }, [open]);

  if (!open) return null;

  function setMax(key: "na3" | "cha7et", value: number | null) {
    setDraft((g) => ({ ...g, [key]: value }));
  }

  function bump(key: "na3" | "cha7et", delta: number) {
    setDraft((g) => {
      const cur = g[key];
      if (cur === null) {
        const suggest = key === "na3" ? suggestNa3 : suggestCha7et;
        const start = Math.max(1, suggest ?? 3);
        return { ...g, [key]: start };
      }
      const next = cur + delta;
      if (next < 0) return { ...g, [key]: null };
      return { ...g, [key]: Math.min(99, next) };
    });
  }

  function onSave() {
    saveGoals(draft);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="goals-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-5 shadow-xl">
        <h2
          id="goals-title"
          className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--fg)]"
        >
          Objectif du jour
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
          Plafond max par jour. Tu peux toujours logger — on te prévient avant
          et après le cap.
        </p>

        <div className="mt-6 space-y-5">
          <GoalRow
            title="Na3Na3 · joints"
            accent="var(--accent)"
            value={draft.na3}
            onBump={(d) => bump("na3", d)}
            onClear={() => setMax("na3", null)}
            onEnable={() =>
              setMax("na3", Math.max(1, suggestNa3 ?? 3))
            }
          />
          <GoalRow
            title="cha7et · cig."
            accent="var(--cha7et)"
            value={draft.cha7et}
            onBump={(d) => bump("cha7et", d)}
            onClear={() => setMax("cha7et", null)}
            onEnable={() =>
              setMax("cha7et", Math.max(1, suggestCha7et ?? 5))
            }
          />
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onSave}
            className="w-full rounded-full bg-[var(--accent)] px-5 py-3.5 text-[var(--accent-fg)]"
          >
            Enregistrer
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full px-5 py-3 text-sm text-[var(--muted)]"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

function GoalRow({
  title,
  accent,
  value,
  onBump,
  onClear,
  onEnable,
}: {
  title: string;
  accent: string;
  value: number | null;
  onBump: (delta: number) => void;
  onClear: () => void;
  onEnable: () => void;
}) {
  if (value === null) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium" style={{ color: accent }}>
            {title}
          </p>
          <p className="text-xs text-[var(--muted)]">Pas de plafond</p>
        </div>
        <button
          type="button"
          onClick={onEnable}
          className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--fg)]"
        >
          Définir
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium" style={{ color: accent }}>
          {title}
        </p>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-[var(--muted)]"
        >
          Désactiver
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onBump(-1)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] text-lg text-[var(--fg)]"
          aria-label="Moins"
        >
          −
        </button>
        <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums text-[var(--fg)]">
          max {value}
        </p>
        <button
          type="button"
          onClick={() => onBump(1)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] text-lg text-[var(--fg)]"
          aria-label="Plus"
        >
          +
        </button>
      </div>
    </div>
  );
}
