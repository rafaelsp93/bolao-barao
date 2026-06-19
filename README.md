# ⚽ Bolão do Barão — Copa do Mundo 2026

A friend-group World Cup sweepstake. Predict match scores, bet on the champion
and top scorer, and climb a live "Stadium Night" scoreboard.

- **Scoring (per match, flat across stages):** exact score **10**, correct result
  + one team's goals **5**, correct result only **3**, wrong **0**. Champion
  bet **25**, top scorer **15**.
- **Locks:** match predictions lock at kickoff; champion/top-scorer bets freeze
  at the end of a player's first-login day.
- **Stack:** Next.js (App Router) · Drizzle + Neon Postgres · Auth.js magic-link
  via Resend · football-data.org (free tier) · Tailwind v4.

## Local development

```bash
cp .env.example .env        # fill in the values (see below)
npm install
npm run db:push             # create tables in your Neon database
npm run db:seed             # optional: demo teams/players/matches
npm run dev                 # http://localhost:3000
npm test                    # scoring / locks / standings unit tests
```

## Required services (all have free tiers)

1. **Neon Postgres** — create a project, copy the connection string into
   `DATABASE_URL`, then `npm run db:push`.
2. **Resend** — create an API key (`AUTH_RESEND_KEY`). **Important:** to email
   anyone other than your own Resend account address you must **verify a sending
   domain** (add its DNS records) and set `EMAIL_FROM` to an address on it.
   Without this, magic-link login only works for your own email.
3. **football-data.org** — free API token (`FOOTBALL_DATA_TOKEN`). Covers WC 2026
   fixtures, scores, standings, and scorers.
4. **AUTH_SECRET** — `openssl rand -base64 32`.
5. **ADMIN_EMAILS** — comma-separated; these emails become admins on first login.

## Deploy (Vercel + GitHub Actions cron)

1. Push to GitHub, import the repo in **Vercel**.
2. Set all env vars from `.env.example` in Vercel (set `NEXTAUTH_URL` to the
   production URL).
3. Add GitHub repo **secrets**: `APP_URL` (the Vercel URL) and `CRON_SECRET`
   (same value as in Vercel). The workflows in `.github/workflows/` call the
   protected cron routes:
   - `ingest.yml` — every 15 min: sync results + recompute scores.
   - `reminders.yml` — hourly: email players with un-predicted upcoming matches.
4. As admin, open **/admin → Sincronizar agora** to pull real fixtures, and use
   the form to backfill each player's starting points from the old platform.

## How scoring stays correct

`lib/scoring.ts` is a pure, tested function. The caller passes the
regulation + extra-time scoreline (penalty shootouts are ignored), so a knockout
level after ET scores as a draw. Recompute runs on every ingest and after any
admin score override.
