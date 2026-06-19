import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// The neon-http driver is lazy — it only performs a request when a query runs —
// so constructing this at import time is safe even without a real DATABASE_URL
// (e.g. during `next build`). A placeholder keeps the Auth.js Drizzle adapter's
// dialect detection happy; real queries require DATABASE_URL to be set.
const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@localhost/placeholder";

export const db = drizzle(neon(connectionString), { schema });
export { schema };
