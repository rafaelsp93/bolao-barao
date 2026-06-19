"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { LeaderboardEntry } from "@/lib/leaderboard";

function Movement({ delta }: { delta: number }) {
  if (delta === 0)
    return <span className="text-chalk-dim/50 text-xs">—</span>;
  const up = delta > 0;
  return (
    <span
      className={`tabular text-xs font-bold ${up ? "text-floodlight" : "text-vermilion"}`}
      title={up ? `Subiu ${delta}` : `Caiu ${-delta}`}
    >
      {up ? "▲" : "▼"}
      {Math.abs(delta)}
    </span>
  );
}

function BullseyeIcon() {
  return (
    <span
      className="relative inline-flex h-4 w-4 items-center justify-center rounded-full border border-amber/80 bg-amber/10 shadow-[0_0_12px_-3px_rgba(251,191,36,0.8)]"
      aria-hidden="true"
    >
      <span className="h-2.5 w-2.5 rounded-full border border-amber/70" />
      <span className="absolute h-1 w-1 rounded-full bg-amber" />
    </span>
  );
}

function FireIcon() {
  return (
    <span
      className="relative inline-flex h-4 w-4 items-end justify-center"
      aria-hidden="true"
    >
      <span className="absolute bottom-0 h-3.5 w-3 rounded-t-full rounded-br-full bg-vermilion shadow-[0_0_14px_-3px_rgba(248,113,113,0.9)] [transform:rotate(45deg)]" />
      <span className="relative bottom-0.5 h-2 w-2 rounded-t-full rounded-br-full bg-amber [transform:rotate(45deg)]" />
    </span>
  );
}

function StatBadge({
  children,
  title,
  tone,
}: {
  children: ReactNode;
  title: string;
  tone: "amber" | "floodlight";
}) {
  return (
    <span
      className={`tabular inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[0.68rem] font-bold ${
        tone === "amber"
          ? "border-amber/35 bg-amber/10 text-amber"
          : "border-floodlight/30 bg-floodlight/10 text-floodlight"
      }`}
      title={title}
    >
      {children}
    </span>
  );
}

export function LeaderboardClient({ initial }: { initial: LeaderboardEntry[] }) {
  const [entries, setEntries] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  // Previous rank per user, to compute ▲/▼ between polls.
  const prevRank = useRef<Map<string, number>>(
    new Map(initial.map((e) => [e.userId, e.rank])),
  );
  const [deltas, setDeltas] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = await fetch("/api/leaderboard", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { entries: LeaderboardEntry[] };
        if (!alive) return;
        const newDeltas = new Map<string, number>();
        for (const e of data.entries) {
          const before = prevRank.current.get(e.userId);
          // delta > 0 means moved up (rank number decreased)
          newDeltas.set(e.userId, before == null ? 0 : before - e.rank);
        }
        prevRank.current = new Map(
          data.entries.map((e) => [e.userId, e.rank]),
        );
        setEntries(data.entries);
        setDeltas(newDeltas);
        setUpdatedAt(new Date());
      } catch {
        /* network hiccup — keep last view */
      }
    }
    const id = setInterval(poll, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="uppercase-label">Copa do Mundo 2026</p>
          <h1 className="font-display text-3xl">Classificação</h1>
        </div>
        <div className="flex items-center gap-2 text-chalk-dim">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-floodlight opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-floodlight" />
          </span>
          <span className="tabular text-xs">
            {updatedAt
              ? updatedAt.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "ao vivo"}
          </span>
        </div>
      </div>

      <ol className="flex flex-col gap-2">
        {entries.map((e, i) => {
          const leader = e.rank === 1;
          return (
            <li
              key={e.userId}
              className={`led-panel row-in flex items-center gap-3 px-4 py-3 ${
                leader ? "floodlit" : ""
              }`}
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <div
                className={`tabular w-8 text-center text-2xl font-bold ${
                  leader ? "text-amber" : "text-chalk-dim"
                }`}
              >
                {e.rank}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-lg leading-tight">
                  {e.displayName}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-chalk-dim">
                  {e.exactScores > 0 && (
                    <StatBadge
                      title={`${e.exactScores} cravada${e.exactScores === 1 ? "" : "s"}`}
                      tone="amber"
                    >
                      <BullseyeIcon />
                      {e.exactScores}
                    </StatBadge>
                  )}
                  {e.scoringHits > 0 && (
                    <StatBadge
                      title={`Pontuou em ${e.scoringHits} jogo${e.scoringHits === 1 ? "" : "s"}`}
                      tone="floodlight"
                    >
                      <FireIcon />
                      {e.scoringHits}
                    </StatBadge>
                  )}
                  <Movement delta={deltas.get(e.userId) ?? 0} />
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`tabular text-3xl font-bold leading-none ${
                    leader ? "text-amber" : "text-floodlight"
                  }`}
                >
                  {e.total}
                </div>
                <div className="uppercase-label mt-1">pts</div>
              </div>
            </li>
          );
        })}
        {entries.length === 0 && (
          <li className="led-panel px-4 py-10 text-center text-chalk-dim">
            Ainda sem pontos. Os palpites aparecem aqui assim que os jogos
            começarem.
          </li>
        )}
      </ol>
    </section>
  );
}
