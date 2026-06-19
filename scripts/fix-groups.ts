// One-off: strip the "GROUP_" prefix from already-ingested match group names.
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql, isNotNull } from "drizzle-orm";
import * as schema from "../lib/db/schema";

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

async function main() {
  await db
    .update(schema.matches)
    .set({ groupName: sql`replace(${schema.matches.groupName}, 'GROUP_', '')` })
    .where(isNotNull(schema.matches.groupName));
  const rows = await db
    .selectDistinct({ g: schema.matches.groupName })
    .from(schema.matches);
  console.log("group names now:", rows.map((r) => r.g).filter(Boolean).sort().join(", "));
}
main().then(() => process.exit(0));
