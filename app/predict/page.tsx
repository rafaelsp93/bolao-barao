import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getEnrichedMatches, getUserPredictionsMap } from "@/lib/queries";
import { brtDayKey, brtDayLabel, brtTime } from "@/lib/datetime";
import {
  PredictClient,
  type PredictDay,
  type PredictMatch,
} from "@/components/predict-client";

export const dynamic = "force-dynamic";

export default async function PredictPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [all, preds] = await Promise.all([
    getEnrichedMatches(),
    getUserPredictionsMap(user.id),
  ]);

  // Open matches (not finished), soonest first.
  const open = all.filter((m) => m.status !== "finished");

  // Group by Brazil-time calendar day, preserving kickoff order.
  const days: PredictDay[] = [];
  const byKey = new Map<string, PredictDay>();
  for (const m of open) {
    const key = brtDayKey(m.kickoffAt);
    let day = byKey.get(key);
    if (!day) {
      day = { key, label: brtDayLabel(m.kickoffAt), matches: [] };
      byKey.set(key, day);
      days.push(day);
    }
    const p = preds.get(m.id);
    const match: PredictMatch = {
      id: m.id,
      groupName: m.groupName,
      stage: m.stage,
      kickoffAt: m.kickoffAt.toISOString(),
      timeLabel: brtTime(m.kickoffAt),
      home: m.home ? { name: m.home.name, crest: m.home.crest } : null,
      away: m.away ? { name: m.away.name, crest: m.away.crest } : null,
      predHome: p?.predHome ?? null,
      predAway: p?.predAway ?? null,
    };
    day.matches.push(match);
  }

  return (
    <section>
      <p className="uppercase-label">Seus palpites</p>
      <h1 className="mb-1 font-display text-3xl">Palpitar nos jogos</h1>
      <p className="mb-5 text-sm text-chalk-dim">
        Horários no fuso de Brasília. Cada palpite fecha no apito inicial.
      </p>
      <PredictClient days={days} />
    </section>
  );
}
