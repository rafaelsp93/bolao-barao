/**
 * Deadline rules — pure functions over an injected `now` so they're testable.
 *
 *  - Match predictions lock at kickoff.
 *  - Tournament bets (champion + top scorer) stay open only through the player's
 *    first-login calendar day (UTC), then freeze. This is the lenient
 *    mid-tournament migration rule.
 */

export function isMatchLocked(kickoffAt: Date, now: Date = new Date()): boolean {
  return now.getTime() >= kickoffAt.getTime();
}

function utcDayIndex(d: Date): number {
  return Math.floor(d.getTime() / 86_400_000);
}

export function areBetsLocked(
  firstLoginAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  // Never logged in yet → not locked (they can still set picks on first login).
  if (!firstLoginAt) return false;
  return utcDayIndex(now) > utcDayIndex(firstLoginAt);
}
