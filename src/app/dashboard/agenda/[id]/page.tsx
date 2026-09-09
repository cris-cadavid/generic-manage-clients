import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { Card, Field, inputCls, btnPrimary, ErrorBanner } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";

async function save(form: FormData) {
  "use server";
  const { orgId } = await requireTenant();
  const id = String(form.get("id"));
  const date = String(form.get("date"));
  const time = String(form.get("time"));
  const appt = await db.appointment.findFirst({ where: { id, orgId }, include: { service: true } });
  if (!appt) redirect("/dashboard/agenda");
  const startsAt = new Date(`${date}T${time}`);
  if (isNaN(startsAt.getTime())) redirect(`/dashboard/agenda/${id}?err=Fecha+inválida`);
  const endsAt = new Date(startsAt.getTime() + (appt.service.durationMin + appt.service.bufferMin) * 60000);
  const clash = await db.appointment.findFirst({
    where: { orgId, staffId: appt.staffId, id: { not: id }, status: { in: ["PENDING", "CONFIRMED"] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
  });
  if (clash) redirect(`/dashboard/agenda/${id}?err=Ese+profesional+ya+tiene+una+reserva+en+ese+horario`);
  await db.appointment.updateMany({ where: { id, orgId }, data: { startsAt, endsAt } });
  redirect("/dashboard/agenda");
}

export default async function Reschedule({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ err?: string }> }) {
  const { id } = await params;
  const { err } = await searchParams;
  const { orgId } = await requireTenant();
  const a = await db.appointment.findFirst({ where: { id, orgId }, include: { customer: true, staff: true, service: true } });
  if (!a) redirect("/dashboard/agenda");
  return (
    <main className="max-w-xl">
      <Link href="/dashboard/agenda" className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900"><ArrowLeft size={15} /> Agenda</Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Reprogramar cita</h1>
      <p className="mt-1 text-sm text-stone-500">{a.customer.name} · {a.service.name} · 💈 {a.staff.name} · actual {a.startsAt.toLocaleString()}</p>
      {err && <ErrorBanner message={decodeURIComponent(err)} />}
      <Card className="mt-4">
        <form action={save} className="grid grid-cols-2 gap-4">
          <input type="hidden" name="id" value={a.id} />
          <Field label="Nueva fecha"><input name="date" type="date" required defaultValue={a.startsAt.toISOString().slice(0, 10)} className={inputCls} /></Field>
          <Field label="Nueva hora"><input name="time" type="time" required defaultValue={a.startsAt.toTimeString().slice(0, 5)} className={inputCls} /></Field>
          <div className="col-span-2"><button className={btnPrimary}>Guardar nuevo horario</button></div>
        </form>
      </Card>
    </main>
  );
}
