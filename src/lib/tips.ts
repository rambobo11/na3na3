import type { GoalStatus } from "./goals";
import { formatEuro, moneyTotal } from "./costs";
import { todayKey } from "./dates";

type TipContext = {
  freeStreak: number;
  moneySavedStreak: number;
  moneyToday: number;
  avg7Na3: number;
  avg7Cha7et: number;
  statusNa3: GoalStatus;
  statusCha7et: GoalStatus;
  hasGoals: boolean;
  todayTotal: number;
  /** Room left under goals (null if no active goal). */
  roomNa3?: number | null;
  roomCha7et?: number | null;
};

function parisHour(now = new Date()): number {
  const h = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour: "numeric",
    hour12: false,
  }).format(now);
  return Number(h);
}

/** Stable pick for the day so the tip doesn't jump on every render. */
function pick(seed: string, options: readonly string[]): string {
  if (options.length === 0) return "";
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return options[Math.abs(h) % options.length]!;
}

/** Short, contextual quit tips — no lecture. Rotates within a bucket per day. */
export function homeTip(ctx: TipContext): string {
  const day = todayKey();
  const hour = parisHour();
  const seed = `${day}:${ctx.todayTotal}:${ctx.freeStreak}:${ctx.statusNa3}:${ctx.statusCha7et}`;

  if (ctx.statusNa3 === "over" || ctx.statusCha7et === "over") {
    return pick(seed, [
      "Dépassé aujourd’hui — demain tu peux repartir sous le plafond.",
      "Cap franchi. Note l’heure : demain, décale ce créneau de 15 min.",
      "Un jour au-dessus n’efface pas la semaine. Reprends demain.",
    ]);
  }

  if (ctx.statusNa3 === "at" || ctx.statusCha7et === "at") {
    return pick(seed, [
      "Objectif atteint. Le prochain peut attendre.",
      "Tu es au plafond — c’est le moment de sortir / boire / bouger 5 min.",
      "Cap touché. Garde le reste pour demain.",
    ]);
  }

  if (ctx.statusNa3 === "near" || ctx.statusCha7et === "near") {
    return pick(seed, [
      "Proche du plafond — un délai de 10 min change souvent la suite.",
      "Encore une ou deux avant le cap. Essaie d’attendre l’envie suivante.",
      "Presque au max. Respire, bois un verre d’eau, reviens dans 10 min.",
    ]);
  }

  if (ctx.freeStreak >= 7 && ctx.moneySavedStreak > 0) {
    return pick(seed, [
      `${ctx.freeStreak} j sans · ${formatEuro(ctx.moneySavedStreak)} gardés. Une semaine+, garde le rythme.`,
      `Une semaine et plus à 0. ${formatEuro(ctx.moneySavedStreak)} restent dans ta poche.`,
      `${ctx.freeStreak} jours clean. Chaque jour ajoute ~${formatEuro(moneyTotal(ctx.avg7Na3, ctx.avg7Cha7et))} non dépensés.`,
    ]);
  }

  if (ctx.freeStreak > 0 && ctx.moneySavedStreak > 0) {
    return pick(seed, [
      `${ctx.freeStreak} j sans · ${formatEuro(ctx.moneySavedStreak)} gardés. Garde le rythme.`,
      `Streak ${ctx.freeStreak} · ${formatEuro(ctx.moneySavedStreak)} économisés. Demain = +1 jour.`,
      `${formatEuro(ctx.moneySavedStreak)} non brûlés grâce à ${ctx.freeStreak} jour${ctx.freeStreak > 1 ? "s" : ""} à 0.`,
    ]);
  }

  if (ctx.freeStreak > 0) {
    return pick(seed, [
      `${ctx.freeStreak} jour${ctx.freeStreak > 1 ? "s" : ""} sans. Le streak grossit demain si tu restes à 0.`,
      `Série en cours : ${ctx.freeStreak}. Un seul log remet à zéro — choisis bien.`,
      `${ctx.freeStreak} j clean. Passe la nuit à 0 pour verrouiller +1.`,
    ]);
  }

  if (!ctx.hasGoals && (ctx.avg7Na3 > 0 || ctx.avg7Cha7et > 0)) {
    const j = Math.max(0, Math.floor(ctx.avg7Na3) - 1);
    const c = Math.max(0, Math.floor(ctx.avg7Cha7et) - 1);
    return pick(seed, [
      `Astuce : vise ${j} joints / ${c} cig. (moyenne −1) pour réduire sans couper net.`,
      `Plafond soft : ${j} / ${c} aujourd’hui. Moins qu’hier en moyenne, pas zéro forcé.`,
      `Réduire d’1 vs ta moyenne 7j (${j} joints · ${c} cig.) marche souvent mieux qu’arrêter net.`,
    ]);
  }

  const roomNa3 = ctx.roomNa3;
  const roomCha7et = ctx.roomCha7et;
  if (
    ctx.hasGoals &&
    ((roomNa3 !== null && roomNa3 !== undefined && roomNa3 > 0) ||
      (roomCha7et !== null && roomCha7et !== undefined && roomCha7et > 0))
  ) {
    const parts: string[] = [];
    if (roomNa3 !== null && roomNa3 !== undefined && roomNa3 > 0) {
      parts.push(`${roomNa3} joint${roomNa3 > 1 ? "s" : ""}`);
    }
    if (roomCha7et !== null && roomCha7et !== undefined && roomCha7et > 0) {
      parts.push(`${roomCha7et} cig.`);
    }
    return pick(seed, [
      `Encore ${parts.join(" · ")} sous le plafond. Tu peux les garder.`,
      `Marge restante : ${parts.join(" · ")}. Pas besoin de tout utiliser.`,
      `Sous le cap — ${parts.join(" · ")} de réserve. Terminer plus bas = win.`,
    ]);
  }

  if (hour >= 17 && ctx.todayTotal > 0) {
    return pick(seed, [
      "Soirée = pic d’envie. Décale le prochain de 15 min avant de logger.",
      "Fin de journée : remplace le geste par une marche ou un café/thé.",
      "Le soir, l’envie passe souvent en 8–12 min. Chronomètre avant le +1.",
    ]);
  }

  if (hour < 11 && ctx.todayTotal === 0) {
    return pick(seed, [
      "Matin à 0 — protège cette avance jusqu’à midi.",
      "Bonne ouverture : reste à 0 le plus longtemps possible ce matin.",
      "Journée propre pour l’instant. Le premier log fixe souvent le ton.",
    ]);
  }

  if (ctx.todayTotal > 0 && ctx.moneyToday > 0) {
    const monthPace = moneyTotal(ctx.avg7Na3, ctx.avg7Cha7et) * 30;
    return pick(seed, [
      `Aujourd’hui ${formatEuro(ctx.moneyToday)} partis. Demain peut coûter moins.`,
      `${formatEuro(ctx.moneyToday)} brûlés aujourd’hui. Un de moins demain = déjà mieux.`,
      monthPace > 0
        ? `À ce rythme ~${formatEuro(monthPace)} / mois. Baisser d’1/j change la note.`
        : `Chaque log a un prix. Aujourd’hui : ${formatEuro(ctx.moneyToday)}.`,
    ]);
  }

  if (ctx.todayTotal === 0) {
    return pick(seed, [
      "Journée à 0 pour l’instant — c’est comme ça qu’un streak commence.",
      "Encore 0. Chaque heure sans log rapproche le premier jour clean.",
      "Clean jusqu’ici. Si l’envie monte, note-la — souvent elle redescend.",
    ]);
  }

  return pick(seed, [
    "Logue honnêtement : les chiffres sont pour toi, pas pour juger.",
    "Un délai avant le +1 bat souvent la volonté seule.",
    "Change un créneau (après manger, pause) plutôt que tout d’un coup.",
    "Hydrate + 2 min dehors = combo simple contre l’envie courte.",
  ]);
}

export function suggestedCeilings(avg7Na3: number, avg7Cha7et: number): {
  na3: number;
  cha7et: number;
} {
  return {
    na3: Math.max(0, Math.floor(avg7Na3) - 1),
    cha7et: Math.max(0, Math.floor(avg7Cha7et) - 1),
  };
}

export function dailyPaceEuro(avg7Na3: number, avg7Cha7et: number): number {
  return moneyTotal(Math.max(0, avg7Na3), Math.max(0, avg7Cha7et));
}
