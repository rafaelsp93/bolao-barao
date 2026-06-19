/**
 * Reminder digest: email each player the upcoming matches (within a time
 * window) they haven't predicted yet. Stateless — cadence is controlled by the
 * cron schedule that calls it.
 */

import { and, gte, lte, eq } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { matches, predictions, users, teams } from "@/lib/db/schema";
import { teamNamePtBr } from "@/lib/team-names";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function sendReminders(windowHours = 24) {
  const now = new Date();
  const until = new Date(now.getTime() + windowHours * 3_600_000);

  const upcoming = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.status, "scheduled"),
        gte(matches.kickoffAt, now),
        lte(matches.kickoffAt, until),
      ),
    );
  if (upcoming.length === 0) return { emailed: 0, matches: 0 };

  const teamRows = await db.select().from(teams);
  const teamName = new Map(teamRows.map((t) => [t.id, teamNamePtBr(t)]));
  const label = (m: (typeof upcoming)[number]) =>
    `${teamName.get(m.homeTeamId ?? "") ?? "?"} × ${teamName.get(m.awayTeamId ?? "") ?? "?"}`;

  const players = await db.select().from(users);
  const resendKey = process.env.AUTH_RESEND_KEY;
  const from = process.env.EMAIL_FROM;
  const resend = resendKey ? new Resend(resendKey) : null;

  let emailed = 0;
  for (const player of players) {
    if (!player.email) continue;
    const predicted = await db
      .select({ matchId: predictions.matchId })
      .from(predictions)
      .where(eq(predictions.userId, player.id));
    const predictedIds = new Set(predicted.map((p) => p.matchId));
    const missing = upcoming.filter((m) => !predictedIds.has(m.id));
    if (missing.length === 0) continue;

    const list = missing
      .map(
        (m) =>
          `<li>${label(m)} — ${new Date(m.kickoffAt).toUTCString()}</li>`,
      )
      .join("");
    const html = `
      <div style="font-family:system-ui,sans-serif">
        <h2>⚽ Faltam seus palpites!</h2>
        <p>Olá ${player.displayName ?? ""}, você ainda não palpitou nestes jogos:</p>
        <ul>${list}</ul>
        <p><a href="${APP_URL}/predict">Palpitar agora →</a></p>
      </div>`;

    if (resend && from) {
      await resend.emails.send({
        from,
        to: player.email,
        subject: `⚽ ${missing.length} jogo(s) sem palpite`,
        html,
      });
    }
    emailed++;
  }
  return { emailed, matches: upcoming.length };
}
