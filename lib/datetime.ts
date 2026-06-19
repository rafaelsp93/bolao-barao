// All match times are shown in Brazil time (the whole group is in Brazil), and
// days are grouped by the Brazil-time calendar date.
const TZ = "America/Sao_Paulo";

export function brtDayKey(d: Date): string {
  // en-CA yields YYYY-MM-DD, ideal as a stable grouping key.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function brtDayLabel(d: Date): string {
  const s = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function brtTime(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
