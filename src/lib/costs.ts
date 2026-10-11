/** Estimated cost per cha7et (joint), all-in. */
export const CHA7ET_EUR = 2.5;

/**
 * Rough ingredients the user used to land on ~2.50 € / joint:
 * - tobacco pack ≈ 3.60 €
 * - papers pack ≈ 2.00–2.50 €
 * - herb: no exact figure → folded into the 2.50 € estimate
 */
export const COST_NOTES = {
  tobaccoPackEur: 3.6,
  papersPackEurMin: 2,
  papersPackEurMax: 2.5,
} as const;

export function moneyForCha7et(count: number): number {
  return Math.max(0, count) * CHA7ET_EUR;
}

const euroFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatEuro(n: number): string {
  return euroFmt.format(n);
}
