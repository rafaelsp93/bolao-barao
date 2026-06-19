import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, predictions } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { isMatchLocked } from "@/lib/locks";

const Body = z.object({
  matchId: z.string().min(1),
  predHome: z.number().int().min(0).max(30),
  predAway: z.number().int().min(0).max(30),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { matchId, predHome, predAway } = parsed.data;

  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) return NextResponse.json({ error: "match not found" }, { status: 404 });

  if (isMatchLocked(match.kickoffAt)) {
    return NextResponse.json(
      { error: "match locked (kickoff passed)" },
      { status: 409 },
    );
  }

  await db
    .insert(predictions)
    .values({ userId: user.id, matchId, predHome, predAway })
    .onConflictDoUpdate({
      target: [predictions.userId, predictions.matchId],
      set: { predHome, predAway, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}
