import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { signOut } from "@/lib/auth";
import { NavLink } from "@/components/nav-link";

const links = [
  { href: "/", label: "Tabela" },
  { href: "/predict", label: "Palpites" },
  { href: "/rounds", label: "Rodadas" },
  { href: "/stats", label: "Estatísticas" },
];

export async function NavBar() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-night/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-floodlight shadow-[0_0_12px_2px_rgba(52,211,153,0.7)]" />
          <span className="font-display text-lg leading-none tracking-tight">
            BOLÃO <span className="text-floodlight">DO BARÃO</span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 sm:flex">
          {links.map((l) => (
            <NavLink key={l.href} href={l.href}>
              {l.label}
            </NavLink>
          ))}
          {user?.role === "admin" && (
            <NavLink href="/admin" tone="admin">
              Admin
            </NavLink>
          )}
        </nav>

        {user ? (
          <div className="ml-2 flex items-center gap-2">
            <Link
              href="/profile"
              className="max-w-[8rem] truncate rounded-md px-2 py-1.5 text-sm text-chalk-dim transition-colors hover:bg-panel hover:text-chalk"
              title="Editar perfil"
            >
              {user.displayName ?? user.email}
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="rounded-md border border-line px-3 py-1.5 text-sm text-chalk-dim transition-colors hover:text-chalk">
                Sair
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="ml-auto rounded-md bg-floodlight px-3 py-1.5 text-sm font-semibold text-night transition-transform hover:scale-[1.03] sm:ml-2"
          >
            Entrar
          </Link>
        )}
      </div>

      {/* Mobile nav */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-line px-3 py-2 sm:hidden">
        {links.map((l) => (
          <NavLink key={l.href} href={l.href} compact>
            {l.label}
          </NavLink>
        ))}
        {user?.role === "admin" && (
          <NavLink href="/admin" tone="admin" compact>
            Admin
          </NavLink>
        )}
      </nav>
    </header>
  );
}
