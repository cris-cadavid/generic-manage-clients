import { DEFAULT_SCHEDULE, type Schedule } from "@/lib/slots";

const DAYS = [
  { n: 1, label: "Lunes" }, { n: 2, label: "Martes" }, { n: 3, label: "Miércoles" },
  { n: 4, label: "Jueves" }, { n: 5, label: "Viernes" }, { n: 6, label: "Sábado" }, { n: 0, label: "Domingo" },
];

/** Editor de horario semanal. name prefix para FormData: `h_{day}_{open|close|on}` */
export default function ScheduleEditor({ schedule }: { schedule: unknown }) {
  const s = (schedule as Schedule | null) ?? DEFAULT_SCHEDULE;
  return (
    <fieldset className="text-sm">
      Horario de atención (define los huecos que ve el cliente)
      <div className="mt-1 flex flex-col gap-1">
        {DAYS.map((d) => {
          const h = s.days?.[String(d.n)];
          return (
            <div key={d.n} className="flex items-center gap-2">
              <label className="flex w-28 items-center gap-1">
                <input type="checkbox" name={`h_${d.n}_on`} defaultChecked={!!h} /> {d.label}
              </label>
              <input type="time" name={`h_${d.n}_open`} defaultValue={h?.open ?? "09:00"} className="rounded border px-1 py-0.5" />
              <span>–</span>
              <input type="time" name={`h_${d.n}_close`} defaultValue={h?.close ?? "19:00"} className="rounded border px-1 py-0.5" />
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

export function parseSchedule(form: FormData): Schedule {
  const days: Record<string, { open: string; close: string }> = {};
  for (let n = 0; n <= 6; n++) {
    if (form.get(`h_${n}_on`)) {
      days[String(n)] = {
        open: String(form.get(`h_${n}_open`) || "09:00"),
        close: String(form.get(`h_${n}_close`) || "19:00"),
      };
    }
  }
  return { slot: 30, days };
}
