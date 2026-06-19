/**
 * Demo seed — lets you click through every screen locally without a
 * football-data.org token. Inserts a few teams, strikers, and matches
 * (one finished, two upcoming). Idempotent. Run with: npm run db:seed
 *
 * In production you don't need this: use Admin → "Sincronizar agora" to pull
 * real fixtures/results from football-data.org.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../lib/db/schema";

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

const TEAMS = [
  { id: "BRA", name: "Brasil", groupName: "A" },
  { id: "SRB", name: "Sérvia", groupName: "A" },
  { id: "SUI", name: "Suíça", groupName: "A" },
  { id: "CMR", name: "Camarões", groupName: "A" },
  { id: "ARG", name: "Argentina", groupName: "B" },
  { id: "MEX", name: "México", groupName: "B" },
];

const PLAYERS = [
  { name: "Vinícius Júnior", teamId: "BRA", position: "Attacker" },
  { name: "Rodrygo", teamId: "BRA", position: "Attacker" },
  { name: "Lionel Messi", teamId: "ARG", position: "Attacker" },
  { name: "Julián Álvarez", teamId: "ARG", position: "Attacker" },
];

async function main() {
  for (const t of TEAMS) {
    await db.insert(schema.teams).values(t).onConflictDoNothing();
  }
  for (const p of PLAYERS) {
    await db.insert(schema.players).values(p).onConflictDoNothing();
  }

  const now = Date.now();
  const h = 3_600_000;
  await db
    .insert(schema.matches)
    .values([
      {
        externalId: "demo-1",
        stage: "group",
        groupName: "A",
        matchday: 1,
        homeTeamId: "BRA",
        awayTeamId: "SRB",
        kickoffAt: new Date(now - 24 * h),
        status: "finished",
        homeGoals: 2,
        awayGoals: 0,
      },
      {
        externalId: "demo-2",
        stage: "group",
        groupName: "A",
        matchday: 2,
        homeTeamId: "BRA",
        awayTeamId: "SUI",
        kickoffAt: new Date(now + 6 * h),
        status: "scheduled",
      },
      {
        externalId: "demo-3",
        stage: "group",
        groupName: "B",
        matchday: 1,
        homeTeamId: "ARG",
        awayTeamId: "MEX",
        kickoffAt: new Date(now + 30 * h),
        status: "scheduled",
      },
    ])
    .onConflictDoNothing();

  console.log("Seed complete: teams, players, and 3 demo matches.");
}

main().then(() => process.exit(0));
