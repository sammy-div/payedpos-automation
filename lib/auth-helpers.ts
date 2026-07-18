import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison so an attacker measuring response latency
 * can't learn how many leading characters of a guessed secret matched -
 * a plain `===` string comparison leaks that via early-exit timing.
 */
export function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on mismatched lengths rather than returning
  // false, so check that separately first (length alone isn't a secret
  // worth protecting here - what matters is not leaking *content*).
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Extracts a Bearer token from an Authorization header, or "" if absent/malformed. */
export function extractBearerToken(authHeader: string | null): string {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return "";
  return authHeader.slice("Bearer ".length);
}
