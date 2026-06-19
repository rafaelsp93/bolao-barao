import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { getEnrichedMatches } from "@/lib/queries";
import { ingestAll, recomputeScores } from "@/lib/ingest";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const user = await getSessionUser();
  if (user?.role !== "admin") redirect("/");
  return user;
}

export default async function AdminPage() {
  await requireAdmin();

  const [allMatches, userRows] = await Promise.all([
    getEnrichedMatches(),
    db.select().from(users).orderBy(asc(users.email)),
  ]);

  /* ---------------- server actions ---------------- */

  async function syncNow() {
    "use server";
    await requireAdmin();
    await ingestAll();
    revalidatePath("/admin");
    revalidatePath("/");
  }

  async function saveScore(formData: FormData) {
    "use server";
    await requireAdmin();
    const matchId = String(formData.get("matchId"));
    const homeGoals = Number(formData.get("homeGoals"));
    const awayGoals = Number(formData.get("awayGoals"));
    if (!matchId || Number.isNaN(homeGoals) || Number.isNaN(awayGoals)) return;
    await db
      .update(matches)
      .set({ homeGoals, awayGoals, status: "finished", lastSyncedAt: new Date() })
      .where(eq(matches.id, matchId));
    await recomputeScores();
    revalidatePath("/");
    revalidatePath("/admin");
  }

  async function addAdjustment(formData: FormData) {
    "use server";
    await requireAdmin();
    const userId = String(formData.get("userId"));
    const points = Number(formData.get("points"));
    const reason = String(formData.get("reason") ?? "");
    if (!userId || Number.isNaN(points)) return;
    const { pointsAdjustments } = await import("@/lib/db/schema");
    await db.insert(pointsAdjustments).values({ userId, points, reason });
    revalidatePath("/");
    revalidatePath("/admin");
  }

  const inputClass =
    "rounded-lg border border-line bg-night px-3 py-2 text-chalk outline-none focus:border-floodlight";
  const btnClass =
    "rounded-lg bg-floodlight px-4 py-2 font-semibold text-night transition-transform hover:scale-[1.02]";

  return (
    <section className="flex flex-col gap-6">
      <div>
        <p className="uppercase-label">Painel</p>
        <h1 className="font-display text-3xl">Admin</h1>
      </div>

      {/* Sync */}
      <div className="led-panel p-5">
        <h2 className="font-display text-lg text-floodlight">Sincronizar dados</h2>
        <p className="mt-1 text-sm text-chalk-dim">
          Busca jogos, placares e artilheiros no football-data.org e recalcula a
          pontuação.
        </p>
        <form action={syncNow} className="mt-3">
          <button className={btnClass}>Sincronizar agora</button>
        </form>
      </div>

      {/* Score override */}
      <div className="led-panel p-5">
        <h2 className="font-display text-lg text-floodlight">
          Corrigir placar (manual)
        </h2>
        <p className="mt-1 text-sm text-chalk-dim">
          Use o placar após a prorrogação (sem pênaltis). Recalcula os pontos na
          hora.
        </p>
        <form action={saveScore} className="mt-3 flex flex-wrap items-center gap-2">
          <select name="matchId" required className={inputClass}>
            {allMatches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.home?.name ?? "?"} × {m.away?.name ?? "?"} —{" "}
                {m.kickoffAt.toLocaleDateString("pt-BR")}
              </option>
            ))}
          </select>
          <input
            name="homeGoals"
            type="number"
            min={0}
            max={30}
            defaultValue={0}
            className={`${inputClass} tabular w-16`}
            required
          />
          <span className="text-chalk-dim">×</span>
          <input
            name="awayGoals"
            type="number"
            min={0}
            max={30}
            defaultValue={0}
            className={`${inputClass} tabular w-16`}
            required
          />
          <button className={btnClass}>Salvar placar</button>
        </form>
      </div>

      {/* Points backfill */}
      <div className="led-panel p-5">
        <h2 className="font-display text-lg text-floodlight">
          Pontos iniciais (migração)
        </h2>
        <p className="mt-1 text-sm text-chalk-dim">
          Adicione os pontos que o jogador trouxe da plataforma antiga. Somam ao
          total na tabela.
        </p>
        <form action={addAdjustment} className="mt-3 flex flex-wrap items-center gap-2">
          <select name="userId" required className={inputClass}>
            {userRows.map((u) => (
              <option key={u.id} value={u.id}>
                {u.displayName ?? u.email}
              </option>
            ))}
          </select>
          <input
            name="points"
            type="number"
            placeholder="pontos"
            className={`${inputClass} tabular w-24`}
            required
          />
          <input
            name="reason"
            type="text"
            placeholder="motivo (opcional)"
            className={`${inputClass} flex-1`}
          />
          <button className={btnClass}>Adicionar</button>
        </form>
      </div>
    </section>
  );
}
