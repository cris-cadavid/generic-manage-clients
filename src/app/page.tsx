import Link from "next/link";
import { CalendarCheck2, MessageCircle, BellRing, Package, ChartColumn, Users } from "lucide-react";
import { BUSINESS_TYPES } from "@/lib/verticals";

const FEATURES = [
  { icon: CalendarCheck2, title: "Reserva estilo Calendly", sub: "Tu link público con horarios reales por profesional." },
  { icon: MessageCircle, title: "WhatsApp sin API", sub: "Recordatorios y reactivación con el WhatsApp que ya usas." },
  { icon: BellRing, title: "Avisos push", sub: "Entérate al instante de cada reserva." },
  { icon: Package, title: "Inventario", sub: "Productos e insumos con alerta de stock bajo." },
  { icon: ChartColumn, title: "Panel útil", sub: "Ingresos, tops y quién debería volver." },
  { icon: Users, title: "Multi-negocio", sub: "Cada negocio aislado, mismo sistema." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-ink-950 text-stone-100">
      <div className="mx-auto max-w-4xl px-6 py-16 text-center md:py-24">
        <p className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-sm font-medium text-amber-300">
          Vuelve · clientes que regresan
        </p>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-white md:text-5xl">
          Tu negocio lleno, <span className="text-amber-400">sin planillas</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-stone-400">
          Agenda con horarios por profesional, clientes que vuelven solos por WhatsApp y control de caja e inventario. Para barberías, salones, spas, grooming y más.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/register" className="rounded-xl bg-amber-400 px-6 py-3 font-bold text-stone-950 transition hover:bg-amber-300">Crear mi negocio</Link>
          <Link href="/login" className="rounded-xl border border-white/20 px-6 py-3 font-medium transition hover:bg-white/5">Entrar</Link>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {BUSINESS_TYPES.map((t) => (
            <span key={t.value} className="rounded-full bg-white/5 px-3 py-1 text-xs text-stone-300">{t.label}</span>
          ))}
        </div>
        <div className="mt-12 grid grid-cols-1 gap-3 text-left sm:grid-cols-2 md:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-amber-400/30">
                <Icon size={20} className="text-amber-400" />
                <p className="mt-2 font-semibold text-white">{f.title}</p>
                <p className="text-sm text-stone-400">{f.sub}</p>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
