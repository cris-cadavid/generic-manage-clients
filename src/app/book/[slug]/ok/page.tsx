import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default async function BookOk({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ n?: string }> }) {
  const { slug } = await params;
  const { n } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 px-4 text-stone-100">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center text-stone-900 shadow-2xl">
        <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
        <h1 className="mt-3 text-2xl font-bold">¡Listo{n ? `, ${decodeURIComponent(n)}` : ""}! 💈</h1>
        <p className="mt-2 text-sm text-stone-500">Tu reserva quedó solicitada. Te confirman por WhatsApp. Llega 5 minutos antes.</p>
        <Link href={`/book/${slug}`} className="mt-5 inline-block rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white">Reservar otra cita</Link>
      </div>
    </main>
  );
}
