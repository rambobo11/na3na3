/** Na3Na3 = joints, all-in estimate. */
export const NA3_EUR = 2.5;

/** cha7et = normal cigarettes: pack price ÷ cigarettes per pack. */
export const TOBACCO_PACK_EUR = 3.6;
export const CIGS_PER_PACK = 20;
export const CHA7ET_EUR = TOBACCO_PACK_EUR / CIGS_PER_PACK; // 0.18 €

/**
 * Joint (Na3Na3) estimate breakdown (informational):
 * - tobacco pack ≈ 3.60 €
 * - papers ≈ 2.00–2.50 €
 * - herb: no exact figure → folded into 2.50 € / joint
 */
export const COST_NOTES = {
  papersPackEurMin: 2,
  papersPackEurMax: 2.5,
} as const;

export function moneyForNa3(count: number): number {
  return Math.max(0, count) * NA3_EUR;
}

export function moneyForCha7et(count: number): number {
  return Math.max(0, count) * CHA7ET_EUR;
}

export function moneyTotal(na3Count: number, cha7etCount: number): number {
  return moneyForNa3(na3Count) + moneyForCha7et(cha7etCount);
}

/** How many cigarette packs the cha7et count represents. */
export function packsForCha7et(count: number): number {
  return Math.max(0, count) / CIGS_PER_PACK;
}

const euroFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const packFmt = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
});

export function formatEuro(n: number): string {
  return euroFmt.format(n);
}

export function formatPacks(n: number): string {
  return `${packFmt.format(n)} paq.`;
}
