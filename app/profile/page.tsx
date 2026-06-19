import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");
  const { saved } = await searchParams;

  const [me] = await db
    .select()
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1);

  async function updateName(formData: FormData) {
    "use server";
    const u = await getSessionUser();
    if (!u) redirect("/login");
    const displayName = String(formData.get("displayName") ?? "").trim();
    if (!displayName) return;
    await db
      .update(users)
      .set({ displayName: displayName.slice(0, 40) })
      .where(eq(users.id, u.id));
    revalidatePath("/");
    revalidatePath("/profile");
    redirect("/profile?saved=1");
  }

  return (
    <section className="mx-auto max-w-md">
      <p className="uppercase-label">Perfil</p>
      <h1 className="mb-5 font-display text-3xl">Seu nome no bolão</h1>

      <form action={updateName} className="led-panel flex flex-col gap-3 p-5">
        <label className="uppercase-label" htmlFor="displayName">
          Nome de exibição
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          maxLength={40}
          required
          defaultValue={me?.displayName ?? ""}
          placeholder="Como você aparece na tabela"
          className="rounded-lg border border-line bg-night px-4 py-3 text-chalk outline-none focus:border-floodlight"
        />
        <p className="text-xs text-chalk-dim">
          Conta: <span className="tabular">{me?.email}</span>
        </p>
        {saved && (
          <p className="text-sm text-floodlight">✓ Nome atualizado</p>
        )}
        <button className="mt-1 rounded-lg bg-floodlight px-4 py-2.5 font-semibold text-night transition-transform hover:scale-[1.02]">
          Salvar nome
        </button>
      </form>
    </section>
  );
}
