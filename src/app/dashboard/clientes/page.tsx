import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { buildWaLink, normalizePhone } from "@/lib/whatsapp";
import { PageHeader, Card, ErrorBanner, inputCls, btnPrimary } from "@/components/ui";
import { MessageCircle, Search, UserPlus, Users } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";

async function create(form: FormData) {
  "use server";
  const { orgId } = await requireTenant();
  const name = String(form.get("name") ?? "").trim();
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const email = String(form.get("email") ?? "").toLowerCase().trim() || null;
  const notes = String(form.get("notes") ?? "");
  if (!name || !phone) redirect("/dashboard/clientes?err=Teléfono+inválido:+usa+10+dígitos");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/dashboard/clientes?err=Correo+no+válido");
  try {
    await db.customer.create({ data: { orgId, name, phone, email, notes } });
  } catch {
    redirect("/dashboard/clientes?err=Ese+teléfono+o+correo+ya+está+registrado");
  }
  revalidatePath("/dashboard/clientes");
}

async function remove(form: FormData) {
  "use server";
  const { orgId } = await requireTenant();
  const id = String(form.get("id"));
  await db.customer.deleteMany({ where: { id, orgId } });
  revalidatePath("/dashboard/clientes");
}

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ err?: string; q?: string }> }) {
  const { orgId } = await requireTenant();
  const { err, q } = await searchParams;
  const customers = await db.customer.findMany({
    where: { orgId, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { email: { contains: q, mode: "insensitive" } }] } : {}) },
    orderBy: { createdAt: "desc" },
    include: { sales: { orderBy: { date: "desc" }, take: 1 }, _count: { select: { sales: true } } },
  });
  return (
    <main>
      <PageHeader title="Clientes" sub="Fichas, historial y contacto por WhatsApp."
        action={<form className="flex gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input name="q" defaultValue={q ?? ""} placeholder="Buscar…" className={`${inputCls} pl-8`} />
          </div>
          <button className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium">Buscar</button>
        </form>} />
      {err && <ErrorBanner message={decodeURIComponent(err)} />}
      <Card>
        <form action={create} className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          <input name="name" required placeholder="Nombre" className={inputCls} />
          <input name="phone" required placeholder="WhatsApp" className={inputCls} />
          <input name="email" type="email" placeholder="Correo" className={inputCls} />
          <input name="notes" placeholder="Notas (ej. corte degradado)" className={inputCls} />
          <button className={`${btnPrimary} gap-1.5`}><UserPlus size={15} /> Agregar</button>
        </form>
      </Card>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {customers.map((c) => {
          const last = c.sales[0]?.date;
          return (
            <Card key={c.id} className="!p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link href={`/dashboard/clientes/${c.id}`} className="font-semibold hover:underline">{c.name}</Link>
                  <p className="text-sm text-stone-500">{c.phone}{c.email ? ` · ${c.email}` : ""} · {c._count.sales} visita(s){last ? ` · última ${last.toLocaleDateString()}` : ""}</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 text-sm font-bold text-amber-400">
                  {c.name.slice(0, 1).toUpperCase()}
                </span>
              </div>
              <div className="mt-3 flex gap-2 text-sm">
                <Link href={`/dashboard/clientes/${c.id}`} className="rounded-lg border border-stone-300 px-3 py-1.5 font-medium">Ver ficha</Link>
                <Link href={`/dashboard/clientes/${c.id}/editar`} className="rounded-lg border border-stone-300 px-3 py-1.5 font-medium">Editar</Link>
                <a className="inline-flex items-center gap-1 rounded-lg bg-[#25d366] px-3 py-1.5 font-semibold text-white" target="_blank"
                  href={buildWaLink(c.phone, `Hola ${c.name} 👋 ¿Cómo estás?`)}><MessageCircle size={14} /> WhatsApp</a>
                <form action={remove} className="inline"><input type="hidden" name="id" value={c.id} />
                  <button className="px-1 py-1.5 text-sm text-red-600 underline">Eliminar</button></form>
              </div>
            </Card>
          );
        })}
      </div>
      {customers.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-10 text-center">
          <Users size={24} className="mx-auto text-stone-400" />
          <p className="mt-2 font-medium">Aún no hay clientes</p>
          <p className="text-sm text-stone-500">Regístralos con su WhatsApp: es la base de la reactivación.</p>
        </div>
      )}
      {customers.length > 0 && <p className="mt-3 text-xs text-stone-400">Mostrando {customers.length} cliente(s) · acumulado visible en cada ficha.</p>}
    </main>
  );
}
