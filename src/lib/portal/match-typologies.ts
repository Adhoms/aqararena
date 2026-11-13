/**
 * Which live unit type each draft row updates (row index → id): the row's own live id when it
 * still belongs to the project, otherwise a live type with the same code. Each live type is used
 * once. Rows without a match are new. Live types left unmatched are being removed.
 */
export function matchTypologies(existing: { id: string; code: string }[], rows: { code: string; liveId: string | null }[]) {
  const used = new Set<string>();
  const out = new Map<number, string>();
  rows.forEach((r, i) => {
    if (r.liveId && existing.some((e) => e.id === r.liveId) && !used.has(r.liveId)) {
      out.set(i, r.liveId);
      used.add(r.liveId);
    }
  });
  rows.forEach((r, i) => {
    if (out.has(i)) return;
    const same = existing.find((e) => !used.has(e.id) && e.code.toLowerCase() === r.code.toLowerCase());
    if (same) {
      out.set(i, same.id);
      used.add(same.id);
    }
  });
  return out;
}
