import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { recomputeScores } from "@/lib/ingest";

const Body = z.object({
  matchId: z.string().min(1),
  homeGoals: z.number().int().min(0).max(30),
  awayGoals: z.number().int().min(0).max(30),
  status: z.enum(["scheduled", "live", "finished"]).optional(),
});

// Admin manual score override (disputes / API delay). Pass the ET-inclusive,
// shootout-excluded scoreline. Recomputes all affected points immediately.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { matchId, homeGoals, awayGoals, status = "finished" } = parsed.data;

  await db
    .update(matches)
    .set({ homeGoals, awayGoals, status, lastSyncedAt: new Date() })
    .where(eq(matches.id, matchId));

  const updated = await recomputeScores();
  return NextResponse.json({ ok: true, recomputed: updated });
}
