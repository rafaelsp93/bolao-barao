// Make the DB production-ready: remove demo matches, replace the placeholder
// striker list with the real current top scorers. Safe to re-run.
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { like, count } from "drizzle-orm";
import * as schema from "../lib/db/schema";

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });
const { matches, players, scorersCache } = schema;

async function main() {
  // 1. Drop demo fixtures.
  await db.delete(matches).where(like(matches.externalId, "demo-%"));

  // 2. Reset the striker list and reseed from real synced scorers (dedup by name).
  await db.delete(players);
  const scorers = await db.select().from(scorersCache);
  const seen = new Set<string>();
  let added = 0;
  for (const s of scorers) {
    if (seen.has(s.playerName)) continue;
    seen.add(s.playerName);
    await db.insert(players).values({
      name: s.playerName,
      externalId: s.playerExternalId,
      position: "Attacker",
    });
    added++;
  }

  const [{ value: matchCount }] = await db
    .select({ value: count() })
    .from(matches);
  console.log(`Demo matches purged. Real matches remaining: ${matchCount}`);
  console.log(`Striker pick list seeded from real scorers: ${added} players`);
}
main().then(() => process.exit(0));
