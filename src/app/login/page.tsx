"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function LoginForm() {
  const search = useSearchParams();
  const callbackUrl = search.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    if (res?.error) setErr("Correo o contraseña incorrectos");
    else window.location.href = res?.url ?? callbackUrl;
  }

  const input = "w-full rounded-xl border border-stone-300 px-3 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200";
  const regHref = callbackUrl !== "/dashboard" ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/register";

  return (
    <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl">
        <p className="text-3xl">💈</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Bienvenido de vuelta</h1>
        <p className="text-sm text-stone-500">Entra a tu negocio</p>
        <button onClick={() => signIn("google", { callbackUrl })}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 px-4 py-2.5 font-medium transition hover:bg-stone-50">
          <span className="font-bold text-blue-600">G</span> Continuar con Google
        </button>
        <div className="my-4 flex items-center gap-2 text-xs text-stone-400"><span className="h-px flex-1 bg-stone-200" /> o con correo <span className="h-px flex-1 bg-stone-200" /></div>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input className={input} placeholder="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={input} placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
          <button className="rounded-xl bg-stone-900 px-4 py-2.5 font-semibold text-white transition hover:bg-stone-700">Entrar</button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-500">¿Sin cuenta? <Link href={regHref} className="font-medium text-stone-900 underline">Crea tu negocio</Link></p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <Suspense><LoginForm /></Suspense>
    </main>
  );
}
