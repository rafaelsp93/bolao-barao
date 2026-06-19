/**
 * football-data.org (free tier) client + response mapping.
 *
 * Free tier covers WC 2026 fixtures, scores, standings and scorers at 10 req/min.
 * We mirror everything into our own DB (see `ingest()`), so the app reads from
 * Postgres, not the API — that keeps us comfortably under the rate limit.
 *
 * Scoreline note: `score.fullTime` is treated as the regulation+extra-time
 * score (shootout in `score.penalties` is intentionally ignored), matching the
 * knockout scoring rule.
 */

const BASE = "https://api.football-data.org/v4";

type FdStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "SUSPENDED"
  | "POSTPONED"
  | "CANCELLED";

export type FdMatch = {
  id: number;
  utcDate: string;
  status: FdStatus;
  matchday: number | null;
  stage: string;
  group: string | null;
  homeTeam: { id: number; name: string; crest?: string; tla?: string };
  awayTeam: { id: number; name: string; crest?: string; tla?: string };
  score: {
    winner: string | null;
    fullTime: { home: number | null; away: number | null };
    penalties?: { home: number | null; away: number | null };
  };
};

export type FdScorer = {
  player: { id: number; name: string };
  team: { id: number; name: string };
  goals: number | null;
};

function token(): string {
  const t = process.env.FOOTBALL_DATA_TOKEN;
  if (!t) throw new Error("FOOTBALL_DATA_TOKEN is not set");
  return t;
}

function competition(): string {
  return process.env.FOOTBALL_DATA_COMPETITION ?? "WC";
}

async function fd<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Auth-Token": token() },
    // Cache off — we control freshness via our own ingestion cadence.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`football-data ${path} → ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function fetchMatches() {
  return fd<{ matches: FdMatch[] }>(`/competitions/${competition()}/matches`);
}

export function fetchStandings() {
  return fd<{ standings: unknown[] }>(
    `/competitions/${competition()}/standings`,
  );
}

export function fetchScorers() {
  return fd<{ scorers: FdScorer[] }>(
    `/competitions/${competition()}/scorers?limit=30`,
  );
}

/* ----------------------------- mapping ---------------------------- */

export function mapStage(stage: string): string {
  switch (stage) {
    case "GROUP_STAGE":
      return "group";
    case "LAST_32":
      return "r32";
    case "LAST_16":
      return "r16";
    case "QUARTER_FINALS":
      return "qf";
    case "SEMI_FINALS":
      return "sf";
    case "THIRD_PLACE":
      return "third";
    case "FINAL":
      return "final";
    default:
      return "group";
  }
}

export function mapStatus(status: FdStatus): "scheduled" | "live" | "finished" {
  switch (status) {
    case "IN_PLAY":
    case "PAUSED":
      return "live";
    case "FINISHED":
      return "finished";
    default:
      return "scheduled";
  }
}
