import { signIn } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ check?: string }>;
}) {
  const { check } = await searchParams;

  return (
    <div className="mx-auto mt-10 max-w-md">
      <p className="uppercase-label">Copa do Mundo 2026</p>
      <h1 className="font-display text-4xl leading-none">Entrar no bolão</h1>
      <p className="mt-3 text-chalk-dim">
        Sem senha. Coloque seu e-mail e enviamos um link mágico de acesso.
      </p>

      {check ? (
        <div className="led-panel floodlit mt-6 px-5 py-6">
          <p className="font-display text-lg text-amber">Confira seu e-mail</p>
          <p className="mt-1 text-sm text-chalk-dim">
            Enviamos um link de acesso. Abra no mesmo dispositivo para entrar.
          </p>
        </div>
      ) : (
        <form
          action={async (formData) => {
            "use server";
            const email = String(formData.get("email") ?? "").trim();
            if (!email) return;
            await signIn("resend", { email, redirectTo: "/" });
          }}
          className="led-panel mt-6 flex flex-col gap-3 p-5"
        >
          <label className="uppercase-label" htmlFor="email">
            Seu e-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="voce@exemplo.com"
            className="tabular rounded-lg border border-line bg-night px-4 py-3 text-chalk outline-none focus:border-floodlight"
          />
          <button className="mt-1 rounded-lg bg-floodlight px-4 py-3 font-semibold text-night transition-transform hover:scale-[1.02]">
            Enviar link mágico
          </button>
        </form>
      )}
    </div>
  );
}
