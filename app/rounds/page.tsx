import Link from "next/link";
import { Flag } from "@/components/flag";
import { getEnrichedMatches, type EnrichedMatch } from "@/lib/queries";

export const dynamic = "force-dynamic";

const KNOCKOUT_STAGES = ["r32", "r16", "qf", "sf"] as const;
const BRACKET_ROWS = 16;
const STAGE_SPAN: Record<(typeof KNOCKOUT_STAGES)[number], number> = {
  r32: 2,
  r16: 4,
  qf: 8,
  sf: 16,
};

const STAGE_LABEL: Record<string, string> = {
  group: "Fase de grupos",
  r32: "16-avos",
  r16: "Oitavas",
  qf: "Quartas",
  sf: "Semifinais",
  third: "3º lugar",
  final: "Final",
};

type RoundBucket = {
  key: string;
  label: string;
  count: number;
  done: number;
  groups: Set<string>;
  nextKickoff: Date | null;
};

export default async function RoundsIndex() {
  let matches: Awaited<ReturnType<typeof getEnrichedMatches>> = [];
  try {
    matches = await getEnrichedMatches();
  } catch {
    /* DB not ready */
  }

  const groupRounds = buildGroupRounds(matches);
  const knockoutMatches = matches
    .filter((m) => m.stage !== "group")
    .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime());

  return (
    <section className="flex flex-col gap-8">
      <div>
        <p className="uppercase-label">Resultados</p>
        <h1 className="font-display text-3xl">Competição</h1>
        <p className="mt-1 text-sm text-chalk-dim">
          Acompanhe a fase de grupos por rodada e o mata-mata pelo caminho até a
          final.
        </p>
      </div>

      {matches.length === 0 ? (
        <p className="led-panel px-4 py-8 text-center text-chalk-dim">
          As rodadas aparecem quando os jogos forem carregados.
        </p>
      ) : (
        <>
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="uppercase-label">Fase de grupos</p>
                <h2 className="font-display text-2xl">Rodadas</h2>
              </div>
              <span className="tabular text-xs text-chalk-dim">
                {groupRounds.length} rodadas
              </span>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {groupRounds.map((b) => (
                <RoundCard key={b.key} bucket={b} />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3">
              <p className="uppercase-label">Mata-mata</p>
              <h2 className="font-display text-2xl">Chaveamento</h2>
            </div>
            {knockoutMatches.length === 0 ? (
              <p className="led-panel px-4 py-8 text-center text-chalk-dim">
                O chaveamento aparece quando os jogos eliminatórios forem
                carregados.
              </p>
            ) : (
              <KnockoutBracket matches={knockoutMatches} />
            )}
          </section>
        </>
      )}
    </section>
  );
}

function buildGroupRounds(matches: EnrichedMatch[]): RoundBucket[] {
  const buckets = new Map<string, RoundBucket>();
  for (const m of matches.filter((match) => match.stage === "group")) {
    const key = m.matchday ? `md-${m.matchday}` : "group";
    const label = m.matchday ? `Rodada ${m.matchday}` : "Fase de grupos";
    const b = buckets.get(key) ?? {
      key,
      label,
      count: 0,
      done: 0,
      groups: new Set<string>(),
      nextKickoff: null,
    };
    b.count++;
    if (m.status === "finished") b.done++;
    if (m.groupName) b.groups.add(m.groupName);
    if (m.status !== "finished" && (!b.nextKickoff || m.kickoffAt < b.nextKickoff)) {
      b.nextKickoff = m.kickoffAt;
    }
    buckets.set(key, b);
  }

  return [...buckets.values()].sort((a, b) => roundOrder(a.key) - roundOrder(b.key));
}

function roundOrder(key: string): number {
  const n = Number(key.replace("md-", ""));
  return Number.isFinite(n) ? n : 999;
}

function RoundCard({ bucket }: { bucket: RoundBucket }) {
  return (
    <Link
      href={`/rounds/${encodeURIComponent(bucket.key)}`}
      prefetch
      className="led-panel group overflow-hidden p-4 transition-colors hover:border-floodlight"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="uppercase-label">Fase de grupos</p>
          <h3 className="mt-1 font-display text-2xl leading-none">
            {bucket.label}
          </h3>
        </div>
        <div className="rounded-md border border-line bg-night px-2 py-1 text-right">
          <div className="tabular text-sm font-bold text-floodlight">
            {bucket.done}/{bucket.count}
          </div>
          <div className="uppercase-label mt-0 text-[0.56rem]">jogos</div>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-night">
        <div
          className="h-full rounded-full bg-floodlight transition-all group-hover:bg-amber"
          style={{ width: `${Math.round((bucket.done / bucket.count) * 100)}%` }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-chalk-dim">
        <span className="truncate">
          {bucket.groups.size > 0
            ? `Grupos ${[...bucket.groups].sort().join(", ")}`
            : "Todos os grupos"}
        </span>
        <span className="tabular shrink-0">
          {bucket.nextKickoff
            ? bucket.nextKickoff.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              })
            : "concluída"}
        </span>
      </div>
    </Link>
  );
}

function KnockoutBracket({ matches }: { matches: EnrichedMatch[] }) {
  const byStage = new Map<string, EnrichedMatch[]>();
  for (const stage of [...KNOCKOUT_STAGES, "final", "third"]) {
    byStage.set(
      stage,
      matches.filter((m) => m.stage === stage),
    );
  }

  return (
    <div className="relative left-1/2 w-[calc(100vw-1rem)] max-w-7xl -translate-x-1/2 overflow-hidden pb-2 sm:w-[calc(100vw-2rem)]">
      <div className="rounded-xl border border-line bg-night/35 p-2 sm:p-3">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(7rem,8rem)_minmax(0,1fr)] gap-2 xl:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)] xl:gap-3">
          <BracketSide side="left" matchesByStage={byStage} />
          <BracketCenter
            finalMatch={(byStage.get("final") ?? [])[0] ?? null}
            thirdMatch={(byStage.get("third") ?? [])[0] ?? null}
          />
          <BracketSide side="right" matchesByStage={byStage} />
        </div>
      </div>
    </div>
  );
}

function BracketSide({
  side,
  matchesByStage,
}: {
  side: "left" | "right";
  matchesByStage: Map<string, EnrichedMatch[]>;
}) {
  const stages = side === "left" ? KNOCKOUT_STAGES : [...KNOCKOUT_STAGES].reverse();

  return (
    <div className="grid min-w-0 grid-cols-4 gap-1.5 xl:gap-2">
      {stages.map((stage) => (
        <BracketStage
          key={`${side}-${stage}`}
          stage={stage}
          side={side}
          matches={splitStage(matchesByStage.get(stage) ?? [], side)}
        />
      ))}
    </div>
  );
}

function BracketStage({
  stage,
  side,
  matches,
}: {
  stage: (typeof KNOCKOUT_STAGES)[number];
  side: "left" | "right";
  matches: EnrichedMatch[];
}) {
  const span = STAGE_SPAN[stage];
  const slots = BRACKET_ROWS / span;
  const finished = matches.filter((m) => m.status === "finished").length;

  return (
    <div className="min-w-0">
      <Link
        href={`/rounds/${encodeURIComponent(stage)}`}
        prefetch
        className="mb-2 flex items-center justify-between gap-2 rounded-md border border-line bg-night/70 px-2 py-1.5 transition-colors hover:border-floodlight"
      >
        <span className="truncate font-display text-xs leading-none">
          {STAGE_LABEL[stage]}
        </span>
        <span className="tabular text-[0.65rem] text-chalk-dim">
          {finished}/{matches.length}
        </span>
      </Link>

      <div
        className="relative grid min-h-[38rem] gap-y-1 xl:min-h-[44rem]"
        style={{ gridTemplateRows: `repeat(${BRACKET_ROWS}, minmax(1.95rem, 1fr))` }}
      >
        {stage !== "sf" &&
          Array.from({ length: slots / 2 }, (_, pairIndex) => (
            <Connector
              key={pairIndex}
              pairIndex={pairIndex}
              span={span}
              side={side}
            />
          ))}

        {Array.from({ length: slots }, (_, index) => {
          const match = matches[index] ?? null;
          const start = index * span + 1;
          return (
            <div
              key={`${stage}-${index}`}
              className="z-10 self-center"
              style={{ gridRow: `${start} / span ${span}` }}
            >
              {match ? <KnockoutMatch match={match} /> : <EmptyMatch />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BracketCenter({
  finalMatch,
  thirdMatch,
}: {
  finalMatch: EnrichedMatch | null;
  thirdMatch: EnrichedMatch | null;
}) {
  return (
    <div className="grid min-h-[41rem] grid-rows-[1fr_auto_auto_1fr] gap-3 pt-9 xl:min-h-[47rem]">
      <div />
      <div>
        <div className="mb-2 rounded-md border border-amber/35 bg-amber/10 px-2 py-1.5 text-center font-display text-sm leading-none text-amber">
          Final
        </div>
        {finalMatch ? <KnockoutMatch match={finalMatch} featured /> : <EmptyMatch featured />}
      </div>
      <div>
        <div className="mb-2 rounded-md border border-line bg-night/70 px-2 py-1.5 text-center font-display text-xs leading-none text-chalk-dim">
          3º lugar
        </div>
        {thirdMatch ? <KnockoutMatch match={thirdMatch} /> : <EmptyMatch />}
      </div>
      <div />
    </div>
  );
}

function Connector({
  pairIndex,
  span,
  side,
}: {
  pairIndex: number;
  span: number;
  side: "left" | "right";
}) {
  const start = pairIndex * span * 2 + 1;
  const sideClass =
    side === "left" ? "right-[-0.55rem] border-r" : "left-[-0.55rem] border-l";
  const capClass =
    side === "left" ? "right-[-0.55rem] border-r" : "left-[-0.55rem] border-l";

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-0"
      style={{
        top: `calc(((${start - 1}) * (100% / ${BRACKET_ROWS})) + ((100% / ${BRACKET_ROWS}) * ${span} / 2))`,
        height: `calc((100% / ${BRACKET_ROWS}) * ${span})`,
      }}
    >
      <div className={`absolute top-0 h-full w-3 border-line ${sideClass}`} />
      <div className={`absolute top-0 h-px w-3 border-t border-line ${capClass}`} />
      <div className={`absolute bottom-0 h-px w-3 border-t border-line ${capClass}`} />
    </div>
  );
}

function KnockoutMatch({
  match,
  featured = false,
}: {
  match: EnrichedMatch;
  featured?: boolean;
}) {
  const finished = match.status === "finished";

  return (
    <Link
      href={`/rounds/${encodeURIComponent(match.stage)}`}
      prefetch
      className={`block rounded-lg border p-1.5 transition-colors hover:border-floodlight xl:p-2 ${
        featured
          ? "border-amber/45 bg-amber/10 shadow-[0_0_24px_-12px_rgba(251,191,36,0.9)]"
          : "border-line bg-panel/90"
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="tabular text-[0.65rem] text-chalk-dim">
          {match.kickoffAt.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          })}
        </span>
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            finished ? "bg-floodlight" : "bg-chalk-dim/50"
          }`}
        />
      </div>
      <TeamLine
        name={match.home?.name ?? "A definir"}
        crest={match.home?.crest}
        score={finished ? match.homeGoals : null}
      />
      <TeamLine
        name={match.away?.name ?? "A definir"}
        crest={match.away?.crest}
        score={finished ? match.awayGoals : null}
      />
    </Link>
  );
}

function EmptyMatch({ featured = false }: { featured?: boolean }) {
  return (
    <div
      className={`rounded-lg border border-dashed px-1.5 py-2 text-center text-[0.68rem] text-chalk-dim xl:px-2 xl:py-3 xl:text-xs ${
        featured ? "border-amber/30 bg-amber/5" : "border-line bg-panel/35"
      }`}
    >
      A definir
    </div>
  );
}

function TeamLine({
  name,
  crest,
  score,
}: {
  name: string;
  crest: string | null | undefined;
  score: number | null;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5 py-0.5">
      <Flag crest={crest} name={name} className="h-3 w-4.5 xl:h-3.5 xl:w-5" />
      <span className="truncate text-[0.68rem] text-chalk xl:text-xs">{name}</span>
      <span className="tabular min-w-4 text-right text-xs font-bold text-floodlight">
        {score ?? "-"}
      </span>
    </div>
  );
}

function splitStage(matches: EnrichedMatch[], side: "left" | "right") {
  const midpoint = Math.ceil(matches.length / 2);
  return side === "left" ? matches.slice(0, midpoint) : matches.slice(midpoint);
}
