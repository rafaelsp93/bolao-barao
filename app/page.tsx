import { getLeaderboard } from "@/lib/leaderboard";
import { LeaderboardClient } from "@/components/leaderboard-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let initial: Awaited<ReturnType<typeof getLeaderboard>> = [];
  try {
    initial = await getLeaderboard();
  } catch {
    // DB not configured yet (e.g. first boot) — render an empty board.
  }
  return <LeaderboardClient initial={initial} />;
}
