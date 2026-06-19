import {
  pgTable,
  text,
  integer,
  timestamp,
  primaryKey,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Auth.js tables (shape expected by @auth/drizzle-adapter)            */
/* ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  // App-specific fields:
  displayName: text("display_name"),
  role: text("role", { enum: ["player", "admin"] })
    .notNull()
    .default("player"),
  firstLoginAt: timestamp("first_login_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

/* ------------------------------------------------------------------ */
/* Domain tables                                                       */
/* ------------------------------------------------------------------ */

export const teams = pgTable("teams", {
  id: text("id").primaryKey(), // FIFA / source code, e.g. "BRA"
  externalId: text("external_id"),
  name: text("name").notNull(),
  crest: text("crest"), // flag/crest URL
  groupName: text("group_name"), // "A".."L" (null once knockouts)
});

export const players = pgTable("players", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  externalId: text("external_id"),
  name: text("name").notNull(),
  teamId: text("team_id").references(() => teams.id),
  position: text("position"),
});

export const matches = pgTable("matches", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  externalId: text("external_id").unique(),
  stage: text("stage", {
    enum: ["group", "r32", "r16", "qf", "sf", "third", "final"],
  }).notNull(),
  groupName: text("group_name"),
  matchday: integer("matchday"), // for round-by-round grouping
  homeTeamId: text("home_team_id").references(() => teams.id),
  awayTeamId: text("away_team_id").references(() => teams.id),
  kickoffAt: timestamp("kickoff_at", { mode: "date" }).notNull(),
  status: text("status", { enum: ["scheduled", "live", "finished"] })
    .notNull()
    .default("scheduled"),
  // ET-inclusive, shootout-excluded scoreline used for scoring:
  homeGoals: integer("home_goals"),
  awayGoals: integer("away_goals"),
  lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
});

export const predictions = pgTable(
  "predictions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    predHome: integer("pred_home").notNull(),
    predAway: integer("pred_away").notNull(),
    points: integer("points"), // null until the match is finished + scored
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (p) => [uniqueIndex("predictions_user_match_uq").on(p.userId, p.matchId)],
);

export const tournamentBets = pgTable("tournament_bets", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  championTeamId: text("champion_team_id").references(() => teams.id),
  topScorerPlayerId: text("top_scorer_player_id").references(() => players.id),
  points: integer("points"), // computed at tournament end
  submittedAt: timestamp("submitted_at", { mode: "date" }).notNull().defaultNow(),
});

export const pointsAdjustments = pgTable("points_adjustments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  points: integer("points").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// Cached standings rows mirrored from football-data.org.
export const standingsCache = pgTable("standings_cache", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  groupName: text("group_name").notNull(),
  position: integer("position").notNull(),
  teamId: text("team_id").references(() => teams.id),
  played: integer("played").notNull().default(0),
  won: integer("won").notNull().default(0),
  draw: integer("draw").notNull().default(0),
  lost: integer("lost").notNull().default(0),
  goalsFor: integer("goals_for").notNull().default(0),
  goalsAgainst: integer("goals_against").notNull().default(0),
  points: integer("points").notNull().default(0),
});

// Cached top scorers mirrored from football-data.org.
export const scorersCache = pgTable("scorers_cache", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  rank: integer("rank").notNull(),
  playerName: text("player_name").notNull(),
  playerExternalId: text("player_external_id"),
  teamId: text("team_id").references(() => teams.id),
  goals: integer("goals").notNull().default(0),
  isTopScorer: boolean("is_top_scorer").notNull().default(false),
});

export type User = typeof users.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Player = typeof players.$inferSelect;
export type TournamentBet = typeof tournamentBets.$inferSelect;
