import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { pointsAdjustments } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";

const Body = z.object({
  userId: z.string().min(1),
  points: z.number().int(),
  reason: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { userId, points, reason } = parsed.data;
  await db.insert(pointsAdjustments).values({ userId, points, reason });
  return NextResponse.json({ ok: true });
}
