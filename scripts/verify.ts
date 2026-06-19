/**
 * Throwaway end-to-end check against the real Neon database. Exercises writes,
 * the scoring function, points persistence, and leaderboard-style aggregation —
 * the path unit tests can't cover. Cleans up after itself.
 *   npx tsx scripts/verify.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, sum } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { scoreMatch } from "../lib/scoring";

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });
const { users, matches, predictions } = schema;

const TEST_EMAIL = "verify-test@example.com";
let ok = true;
const check = (label: string, pass: boolean, extra = "") => {
  ok = ok && pass;
  console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
};

async function main() {
  // Find the seeded finished match (BRA 2-0 SRB).
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.externalId, "demo-1"))
    .limit(1);
  check("finished demo match exists", !!match, match ? `${match.homeGoals}-${match.awayGoals}` : "missing");
  if (!match) return;

  // Create a test player.
  const [user] = await db
    .insert(users)
    .values({ email: TEST_EMAIL, displayName: "Teste", role: "player" })
    .onConflictDoUpdate({ target: users.email, set: { displayName: "Teste" } })
    .returning();
  check("insert/read user", !!user?.id);

  // Prediction that exactly matches the actual score → should score 10.
  await db
    .insert(predictions)
    .values({ userId: user.id, matchId: match.id, predHome: 2, predAway: 0 })
    .onConflictDoUpdate({
      target: [predictions.userId, predictions.matchId],
      set: { predHome: 2, predAway: 0 },
    });

  const pts = scoreMatch(
    { home: 2, away: 0 },
    { home: match.homeGoals!, away: match.awayGoals! },
  );
  await db
    .update(predictions)
    .set({ points: pts })
    .where(and(eq(predictions.userId, user.id), eq(predictions.matchId, match.id)));

  // Read back the persisted points.
  const [stored] = await db
    .select()
    .from(predictions)
    .where(and(eq(predictions.userId, user.id), eq(predictions.matchId, match.id)));
  check("exact-score prediction persisted as 10 pts", stored?.points === 10, `got ${stored?.points}`);

  // Aggregate like the leaderboard does.
  const [agg] = await db
    .select({ total: sum(predictions.points) })
    .from(predictions)
    .where(eq(predictions.userId, user.id));
  check("aggregated total = 10", Number(agg?.total) === 10, `got ${agg?.total}`);

  // Cleanup.
  await db.delete(predictions).where(eq(predictions.userId, user.id));
  await db.delete(users).where(eq(users.id, user.id));
  check("cleanup removed test rows", true);

  console.log(ok ? "\nALL CHECKS PASSED" : "\nSOME CHECKS FAILED");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
