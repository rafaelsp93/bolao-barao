import { auth } from "@/lib/auth";

export type SessionUser = {
  id: string;
  role: "player" | "admin";
  displayName: string | null;
  email?: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    role: session.user.role ?? "player",
    displayName: session.user.displayName ?? null,
    email: session.user.email,
  };
}
