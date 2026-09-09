// Motor de disponibilidad estilo Calendly.
// Horario semanal por barbero en `Staff.schedule`:
// { days: { "1": { open: "09:00", close: "19:00" }, ... }, slot: 30 }
// day: 0=domingo..6=sábado. Si un día no existe → cerrado.

export type DayHours = { open: string; close: string };
export type Schedule = { days?: Record<string, DayHours>; slot?: number };

export const DEFAULT_SCHEDULE: Schedule = {
  slot: 30,
  days: {
    "1": { open: "09:00", close: "19:00" },
    "2": { open: "09:00", close: "19:00" },
    "3": { open: "09:00", close: "19:00" },
    "4": { open: "09:00", close: "19:00" },
    "5": { open: "09:00", close: "19:00" },
    "6": { open: "09:00", close: "14:00" },
  },
};

function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export type Busy = { startsAt: Date; endsAt: Date };

/** Slots libres para una fecha (YYYY-MM-DD) en hora local del servidor. */
export function freeSlots(
  dateStr: string,
  schedule: Schedule,
  durationMin: number,
  bufferMin: number,
  busy: Busy[],
  now = new Date(),
): string[] {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const day = new Date(y, mo - 1, d).getDay();
  const hours = schedule.days?.[String(day)];
  if (!hours) return [];
  const step = schedule.slot ?? 30;
  const total = durationMin + bufferMin;
  const open = toMin(hours.open);
  const close = toMin(hours.close);
  const out: string[] = [];
  for (let t = open; t + total <= close; t += step) {
    const start = new Date(y, mo - 1, d, Math.floor(t / 60), t % 60);
    const end = new Date(start.getTime() + total * 60000);
    if (end <= now) continue; // pasado (incluye hoy)
    const clash = busy.some((b) => start < b.endsAt && end > b.startsAt);
    if (!clash) out.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  return out;
}

/** Próximos N días con disponibilidad (para el selector tipo Calendly). */
export function nextOpenDays(schedule: Schedule, n = 14): string[] {
  const out: string[] = [];
  const cur = new Date();
  for (let i = 0; i < n + 7 && out.length < n; i++) {
    const dt = new Date(cur.getTime() + i * 86400000);
    if (schedule.days?.[String(dt.getDay())]) out.push(dt.toISOString().slice(0, 10));
  }
  return out;
}
