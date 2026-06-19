import Link from "next/link";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { predictions, users } from "@/lib/db/schema";
import { getEnrichedMatches, type EnrichedMatch } from "@/lib/queries";
import { Flag } from "@/components/flag";

export const dynamic = "force-dynamic";

const STAGE_LABEL: Record<string, string> = {
  group: "Fase de grupos",
  r32: "16-avos",
  r16: "Oitavas",
  qf: "Quartas",
  sf: "Semifinal",
  third: "Disputa de 3º",
  final: "Final",
};

function bucketKey(m: EnrichedMatch): string {
  return m.matchday ? `md-${m.matchday}` : m.stage;
}

async function requestTimeMs(): Promise<number> {
  return Date.now();
}

export default async function RoundPage({
  params,
}: {
  params: Promise<{ matchday: string }>;
}) {
  const { matchday } = await params;
  const key = decodeURIComponent(matchday);

  const all = await getEnrichedMatches();
  const roundMatches = all.filter((m) => bucketKey(m) === key);

  const matchIds = roundMatches.map((m) => m.id);
  const [predRows, userRows] = await Promise.all([
    matchIds.length
      ? db.select().from(predictions).where(inArray(predictions.matchId, matchIds))
      : Promise.resolve([]),
    db.select().from(users),
  ]);
  const name = new Map(userRows.map((u) => [u.id, u.displayName ?? u.email]));

  const byMatch = new Map<string, typeof predRows>();
  for (const p of predRows) {
    const list = byMatch.get(p.matchId) ?? [];
    list.push(p);
    byMatch.set(p.matchId, list);
  }

  const label = roundMatches[0]?.matchday
    ? `Rodada ${roundMatches[0].matchday}`
    : STAGE_LABEL[key] ?? key;
  const nowMs = await requestTimeMs();

  return (
    <section>
      <Link href="/rounds" className="text-sm text-chalk-dim hover:text-chalk">
        ← Rodadas
      </Link>
      <div className="mb-5 mt-1 flex items-end justify-between gap-3">
        <div>
          <p className="uppercase-label">Resultados e palpites</p>
          <h1 className="font-display text-3xl">{label}</h1>
        </div>
        {roundMatches.length > 0 && (
          <span className="tabular rounded-md border border-line bg-panel px-2 py-1 text-xs text-chalk-dim">
            {roundMatches.filter((m) => m.status === "finished").length}/
            {roundMatches.length}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {roundMatches.map((m) => {
          const locked = m.kickoffAt.getTime() <= nowMs;
          const picks = byMatch.get(m.id) ?? [];
          const finished = m.status === "finished";
          return (
            <div key={m.id} className="led-panel overflow-hidden">
              <div className="border-b border-line bg-night/35 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="uppercase-label">
                    {m.groupName ? `Grupo ${m.groupName}` : STAGE_LABEL[m.stage]}
                  </span>
                  <span className="tabular text-xs text-chalk-dim">
                    {m.kickoffAt.toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              <div className="px-4 py-4">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
                  <span className="flex min-w-0 flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-end sm:text-right">
                    <Flag
                      crest={m.home?.crest}
                      name={m.home?.name}
                      className="h-5 w-7"
                    />
                    <span className="line-clamp-2 font-display text-sm leading-tight sm:text-base">
                      {m.home?.name ?? "A definir"}
                    </span>
                  </span>
                  <span className="tabular rounded-lg bg-night px-3 py-2 text-2xl font-bold text-floodlight">
                    {finished ? `${m.homeGoals} × ${m.awayGoals}` : "×"}
                  </span>
                  <span className="flex min-w-0 flex-col items-center gap-1.5 text-center sm:flex-row sm:text-left">
                    <Flag
                      crest={m.away?.crest}
                      name={m.away?.name}
                      className="h-5 w-7"
                    />
                    <span className="line-clamp-2 font-display text-sm leading-tight sm:text-base">
                      {m.away?.name ?? "A definir"}
                    </span>
                  </span>
                </div>

                <div className="mt-4 rounded-lg border border-line bg-night/45 p-3">
                  {!locked ? (
                    <p className="text-center text-sm text-chalk-dim">
                      Os palpites são revelados no apito inicial.
                    </p>
                  ) : picks.length === 0 ? (
                    <p className="text-center text-sm text-chalk-dim">
                      Ninguém palpitou neste jogo.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {picks
                        .slice()
                        .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
                        .map((p) => (
                          <li
                            key={p.id}
                            className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md bg-panel/55 px-3 py-2 text-sm"
                          >
                            <span className="min-w-0 truncate text-chalk">
                              {name.get(p.userId)}
                            </span>
                            <span className="tabular text-chalk-dim">
                              {p.predHome} × {p.predAway}
                            </span>
                            <span
                              className={`tabular w-10 text-right font-bold ${
                                finished && p.points === 10
                                  ? "text-amber"
                                  : finished && p.points && p.points > 0
                                    ? "text-floodlight"
                                    : "text-chalk-dim"
                              }`}
                            >
                              {finished && p.points != null ? `+${p.points}` : "—"}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {roundMatches.length === 0 && (
          <p className="led-panel px-4 py-8 text-center text-chalk-dim">
            Rodada não encontrada.
          </p>
        )}
      </div>
    </section>
  );
}
