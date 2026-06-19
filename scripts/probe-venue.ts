import { config } from "dotenv";
config({ path: ".env.local" });
config();

const token = process.env.FOOTBALL_DATA_TOKEN!;
const comp = process.env.FOOTBALL_DATA_COMPETITION ?? "WC";

async function main() {
  const res = await fetch(
    `https://api.football-data.org/v4/competitions/${comp}/matches`,
    { headers: { "X-Auth-Token": token } },
  );
  const data = await res.json();
  const m = data.matches?.[0] ?? {};
  console.log("top-level match keys:", Object.keys(m).join(", "));
  console.log("venue:", JSON.stringify(m.venue));
  console.log("area:", JSON.stringify(m.area));
  console.log("homeTeam keys:", Object.keys(m.homeTeam ?? {}).join(", "));
  console.log("homeTeam.crest:", m.homeTeam?.crest);
  // how many matches actually carry a venue string?
  const withVenue = (data.matches ?? []).filter(
    (x: { venue?: string }) => x.venue,
  ).length;
  console.log(`matches with venue: ${withVenue}/${data.matches?.length}`);
  const venues = [
    ...new Set((data.matches ?? []).map((x: { venue?: string }) => x.venue)),
  ].slice(0, 20);
  console.log("sample venues:", JSON.stringify(venues));
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
