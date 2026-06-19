"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function PendingHint() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`absolute inset-x-2 bottom-1 h-0.5 rounded-full bg-floodlight transition-opacity ${
        pending ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

export function NavLink({
  href,
  children,
  tone = "default",
  compact = false,
}: {
  href: string;
  children: ReactNode;
  tone?: "default" | "admin";
  compact?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  const color =
    tone === "admin"
      ? "text-amber"
      : active
        ? "text-chalk"
        : "text-chalk-dim";

  return (
    <Link
      href={href}
      prefetch
      className={`relative shrink-0 rounded-md transition-colors hover:bg-panel hover:text-chalk ${
        compact ? "px-3 py-2 text-sm" : "px-3 py-1.5 text-sm"
      } ${color} ${active ? "bg-panel/70" : ""}`}
    >
      {children}
      <PendingHint />
    </Link>
  );
}
