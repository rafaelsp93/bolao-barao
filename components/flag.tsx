/* Small flag/crest image beside a team name. Crests come from football-data.org
   (national-team crests are flags). Plain <img> avoids next/image domain config. */
export function Flag({
  crest,
  name,
  className = "",
}: {
  crest?: string | null;
  name?: string;
  className?: string;
}) {
  if (!crest) {
    return (
      <span
        className={`inline-block h-4 w-6 shrink-0 rounded-sm bg-panel-2 ${className}`}
        aria-hidden
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={crest}
      alt={name ? `Bandeira ${name}` : ""}
      className={`inline-block h-4 w-6 shrink-0 rounded-sm object-cover ${className}`}
      loading="lazy"
    />
  );
}
