"use client";

import { useState } from "react";
import { Countdown } from "@/components/countdown";
import { Flag } from "@/components/flag";

export type PredictMatch = {
  id: string;
  groupName: string | null;
  stage: string;
  kickoffAt: string;
  timeLabel: string;
  home: { name: string; crest: string | null } | null;
  away: { name: string; crest: string | null } | null;
  predHome: number | null;
  predAway: number | null;
};

export type PredictDay = {
  key: string;
  label: string;
  matches: PredictMatch[];
};

const STAGE_LABEL: Record<string, string> = {
  group: "Fase de grupos",
  r32: "16-avos",
  r16: "Oitavas",
  qf: "Quartas",
  sf: "Semifinal",
  third: "Disputa 3º",
  final: "Final",
};

function Stepper({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={disabled || value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="h-8 w-8 rounded-md border border-line text-lg leading-none text-chalk-dim transition-colors enabled:hover:border-floodlight enabled:hover:text-chalk disabled:opacity-30"
        aria-label="menos"
      >
        −
      </button>
      <span className="tabular w-7 text-center text-2xl font-bold">{value}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(Math.min(30, value + 1))}
        className="h-8 w-8 rounded-md border border-line text-lg leading-none text-chalk-dim transition-colors enabled:hover:border-floodlight enabled:hover:text-chalk disabled:opacity-30"
        aria-label="mais"
      >
        +
      </button>
    </div>
  );
}

function MatchCard({ match }: { match: PredictMatch }) {
  const [home, setHome] = useState(match.predHome ?? 0);
  const [away, setAway] = useState(match.predAway ?? 0);
  const [locked, setLocked] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(
    match.predHome != null ? "saved" : "idle",
  );

  async function save() {
    setState("saving");
    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchId: match.id, predHome: home, predAway: away }),
    });
    if (res.ok) setState("saved");
    else {
      setState("error");
      if (res.status === 409) setLocked(true);
    }
  }

  return (
    <div className={`led-panel p-4 ${locked ? "opacity-80" : ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="uppercase-label">
          {match.timeLabel}
          <span className="ml-2 text-chalk-dim/70">
            {STAGE_LABEL[match.stage] ?? match.stage}
            {match.groupName ? ` · Grupo ${match.groupName}` : ""}
          </span>
        </span>
        <Countdown kickoff={match.kickoffAt} onLock={() => setLocked(true)} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center justify-end gap-2 text-right">
          <span className="font-display text-base leading-tight">
            {match.home?.name ?? "A definir"}
          </span>
          <Flag crest={match.home?.crest} name={match.home?.name} />
        </div>
        <div className="flex items-center gap-2">
          <Stepper
            value={home}
            onChange={(v) => {
              setHome(v);
              setState("idle");
            }}
            disabled={locked}
          />
          <span className="text-chalk-dim">×</span>
          <Stepper
            value={away}
            onChange={(v) => {
              setAway(v);
              setState("idle");
            }}
            disabled={locked}
          />
        </div>
        <div className="flex flex-1 items-center gap-2">
          <Flag crest={match.away?.crest} name={match.away?.name} />
          <span className="font-display text-base leading-tight">
            {match.away?.name ?? "A definir"}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-3">
        {locked ? (
          <span className="text-xs text-chalk-dim">Palpite fechado</span>
        ) : (
          <>
            {state === "saved" && (
              <span className="text-xs text-floodlight">✓ Salvo</span>
            )}
            {state === "error" && (
              <span className="text-xs text-vermilion">Erro ao salvar</span>
            )}
            <button
              onClick={save}
              disabled={state === "saving"}
              className="rounded-md bg-floodlight px-4 py-1.5 text-sm font-semibold text-night transition-transform hover:scale-[1.03] disabled:opacity-50"
            >
              {state === "saving" ? "Salvando…" : "Salvar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function PredictClient({ days }: { days: PredictDay[] }) {
  if (days.length === 0) {
    return (
      <div className="led-panel px-4 py-10 text-center text-chalk-dim">
        Nenhum jogo aberto para palpite agora. Volte quando os próximos jogos
        forem agendados.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {days.map((day) => (
        <div key={day.key}>
          <h2 className="mb-2 flex items-center gap-3 font-display text-lg text-floodlight">
            {day.label}
            <span className="h-px flex-1 bg-line" />
            <span className="tabular text-xs font-normal text-chalk-dim">
              {day.matches.length} jogo{day.matches.length > 1 ? "s" : ""}
            </span>
          </h2>
          <div className="flex flex-col gap-3">
            {day.matches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
