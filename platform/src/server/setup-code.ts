import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * First-run setup creates the agency admin, so on a public server it must be
 * locked. In production a SETUP_CODE variable is required, and the setup
 * form only works when it's entered.
 */
export function setupCodeStatus(): "not_required" | "required" | "missing" {
  if (process.env.SETUP_CODE) return "required";
  return process.env.NODE_ENV === "production" ? "missing" : "not_required";
}

export function setupCodeMatches(input: unknown) {
  const expected = process.env.SETUP_CODE;
  if (!expected) return process.env.NODE_ENV !== "production";
  if (typeof input !== "string") return false;
  const a = createHash("sha256").update(input.trim()).digest();
  const b = createHash("sha256").update(expected.trim()).digest();
  return timingSafeEqual(a, b);
}
