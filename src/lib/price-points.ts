// The arithmetic behind the price history, kept apart from the database so it can be tested.
// A "point" is a price per m² for one unit type, or for the whole project (typologyId null).

export type PerM2Point = { typologyId: string | null; perM2: number };

/** Today's price per m² for every priced unit type, plus the project's average. */
export function currentPoints(types: { id: string; priceFrom: number; buaM2: number }[]): PerM2Point[] {
  const priced = types.filter((t) => t.priceFrom > 0 && t.buaM2 > 0);
  if (!priced.length) return [];
  const perType = priced.map((t) => ({ typologyId: t.id, perM2: Math.round(t.priceFrom / t.buaM2) }));
  const average = priced.reduce((sum, t) => sum + t.priceFrom / t.buaM2, 0) / priced.length;
  // The same rounding as the "average price per m²" shown on cards and in comparison.
  return [...perType, { typologyId: null, perM2: Math.round(average / 50) * 50 }];
}

/** The points worth recording: those with no earlier figure, or a different one. */
export function changedPoints(earlier: Map<string | null, number>, current: PerM2Point[]): PerM2Point[] {
  return current.filter((p) => earlier.get(p.typologyId) !== p.perM2);
}

/** How far the last figure is from the first, in whole percent (0 when there is nothing to compare). */
export function changePct(points: { perM2: number }[]): number {
  if (points.length < 2 || !points[0].perM2) return 0;
  return Math.round(((points[points.length - 1].perM2 - points[0].perM2) / points[0].perM2) * 100);
}
