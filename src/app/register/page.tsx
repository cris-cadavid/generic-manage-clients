import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import Link from "next/link";

async function register(form: FormData) {
  "use server";
  const name = String(form.get("name") ?? "");
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  const password = String(form.get("password") ?? "");
  const callbackUrl = String(form.get("callbackUrl") ?? "/login");
  const safeBack = callbackUrl.startsWith("/") ? callbackUrl : "/login";
  if (!email || password.length < 6) return;
  const exists = await db.user.findUnique({ where: { email } });
  if (!exists) {
    await db.user.create({ data: { email, name, passwordHash: await bcrypt.hash(password, 10) } });
  }
  redirect(safeBack === "/dashboard" ? "/login" : safeBack.startsWith("/invite/") ? `/login?callbackUrl=${encodeURIComponent(safeBack)}` : "/login");
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  const back = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "";
  const input = "w-full rounded-xl border border-stone-300 px-3 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200";
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl">
        <p className="text-3xl">💈</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Crea tu negocio</h1>
        <p className="text-sm text-stone-500">Gratis · en 1 minuto estás agendando</p>
        <form action={register} className="mt-5 flex flex-col gap-3">
          <input type="hidden" name="callbackUrl" value={back || "/login"} />
          <input name="name" className={input} placeholder="Tu nombre" />
          <input name="email" className={input} placeholder="Correo" type="email" required />
          <input name="password" className={input} placeholder="Contraseña (6+ caracteres)" type="password" required minLength={6} />
          <button className="rounded-xl bg-amber-400 px-4 py-2.5 font-bold text-stone-950 transition hover:bg-amber-300">Crear cuenta</button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-500">¿Ya tienes cuenta? <Link href="/login" className="font-medium text-stone-900 underline">Entra</Link></p>
      </div>
    </main>
  );
}
