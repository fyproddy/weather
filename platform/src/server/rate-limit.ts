import "server-only";

/**
 * Small in-memory limiter for sensitive forms (one server instance).
 * Returns true when the attempt is allowed.
 */
const hits = new Map<string, number[]>();

export function allowAttempt(key: string, max = 5, windowMs = 15 * 60_000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
