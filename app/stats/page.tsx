import { asc, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, teams, scorersCache } from "@/lib/db/schema";
import { computeGroupStandings } from "@/lib/standings";
import { Flag } from "@/components/flag";
import { teamNamePtBr } from "@/lib/team-names";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  let matchRows: (typeof matches.$inferSelect)[] = [];
  let teamRows: (typeof teams.$inferSelect)[] = [];
  let scorers: (typeof scorersCache.$inferSelect)[] = [];
  try {
    [matchRows, teamRows, scorers] = await Promise.all([
      db.select().from(matches).orderBy(asc(matches.kickoffAt)),
      db.select().from(teams),
      db.select().from(scorersCache).orderBy(desc(scorersCache.goals)).limit(15),
    ]);
  } catch {
    /* DB not ready */
  }

  const teamName = new Map(teamRows.map((t) => [t.id, teamNamePtBr(t)]));
  const teamCrest = new Map(teamRows.map((t) => [t.id, t.crest]));
  const standings = computeGroupStandings(matchRows);
  const groups = [...standings.keys()].sort();

  return (
    <section>
      <p className="uppercase-label">Estatísticas</p>
      <h1 className="mb-5 font-display text-3xl">Grupos & Artilharia</h1>

      <h2 className="mb-3 font-display text-xl text-floodlight">Classificação dos grupos</h2>
      {groups.length === 0 ? (
        <p className="led-panel px-4 py-8 text-center text-chalk-dim">
          As tabelas aparecem conforme os jogos da fase de grupos terminam.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <div key={g} className="led-panel p-4">
              <div className="uppercase-label mb-2">Grupo {g}</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-chalk-dim">
                    <th className="text-left font-medium">Time</th>
                    <th className="tabular w-7 text-right font-medium">J</th>
                    <th className="tabular w-9 text-right font-medium">SG</th>
                    <th className="tabular w-9 text-right font-medium">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.get(g)!.map((r, i) => (
                    <tr
                      key={r.teamId}
                      className={i < 2 ? "text-chalk" : "text-chalk-dim"}
                    >
                      <td className="py-1">
                        <span className="flex items-center gap-2">
                          <span className={i < 2 ? "text-floodlight" : ""}>
                            {i + 1}.
                          </span>
                          <Flag
                            crest={teamCrest.get(r.teamId)}
                            name={teamName.get(r.teamId)}
                          />
                          <span className="truncate">
                            {teamName.get(r.teamId) ?? r.teamId}
                          </span>
                        </span>
                      </td>
                      <td className="tabular text-right">{r.played}</td>
                      <td className="tabular text-right">
                        {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
                      </td>
                      <td className="tabular text-right font-bold">{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-8 font-display text-xl text-floodlight">Artilheiros</h2>
      {scorers.length === 0 ? (
        <p className="led-panel px-4 py-8 text-center text-chalk-dim">
          A artilharia será sincronizada assim que houver gols no torneio.
        </p>
      ) : (
        <ol className="led-panel divide-y divide-line">
          {scorers.map((s, i) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="tabular w-6 text-chalk-dim">{i + 1}</span>
              <span className="flex-1">
                {s.playerName}
                {s.isTopScorer && (
                  <span className="ml-2 text-xs text-amber">👑 líder</span>
                )}
              </span>
              <span className="tabular font-bold text-floodlight">{s.goals}</span>
              <span className="uppercase-label">gols</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
