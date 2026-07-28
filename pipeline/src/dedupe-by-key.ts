// Keeps the last occurrence per key. Needed before any Supabase upsert
// batch: openAR uses offset-based pagination sorted by entry date, not a
// unique/stable key, so records can shift across page boundaries while new
// initiatives are being filed concurrently — a fetch can end up containing
// the same id twice. A real Postgres `INSERT ... ON CONFLICT DO UPDATE`
// rejects that outright ("cannot affect row a second time"), unlike an
// in-memory test double, which is why this only surfaced in production
// (2026-07-28), not in unit tests.
export function dedupeByKey<T>(items: T[], keyFn: (item: T) => string): T[] {
  const byKey = new Map<string, T>();
  for (const item of items) {
    byKey.set(keyFn(item), item);
  }
  return [...byKey.values()];
}
