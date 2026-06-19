"use client";

import { useEffect, useState } from "react";

function format(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}:${pad(m)}`;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function Countdown({
  kickoff,
  onLock,
}: {
  kickoff: string;
  onLock?: () => void;
}) {
  const target = new Date(kickoff).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = target - now;
  const locked = remaining <= 0;

  useEffect(() => {
    if (locked) onLock?.();
  }, [locked, onLock]);

  if (locked) {
    return (
      <span className="tabular text-xs font-bold text-vermilion">FECHADO</span>
    );
  }
  const soon = remaining < 3_600_000;
  return (
    <span
      className={`tabular text-xs font-bold ${soon ? "text-amber" : "text-chalk-dim"}`}
    >
      ⏱ {format(remaining)}
    </span>
  );
}
