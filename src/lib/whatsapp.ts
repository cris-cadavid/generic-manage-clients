import { VERTICALS, type BusinessType } from "./verticals";

/** Capa de abstracción WhatsApp. MVP = LinkProvider (wa.me). Futuro: WebExtension / OfficialApi */
export function buildWaLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function reactivationMessage(customerName: string, businessName: string, daysAgo: number): string {
  return `Hola ${customerName} 👋 Soy ${businessName}. Hace ${daysAgo} días que no te vemos. ¿Quieres reservar nuevamente?`;
}

export function reminderMessage(customerName: string, businessName: string, dateStr: string): string {
  return `Hola ${customerName} 👋 Te recordamos tu cita en ${businessName}: ${dateStr}. Confirma con un OK.`;
}

export type ReactivationCandidate = {
  customerId: string;
  name: string;
  phone: string;
  lastVisit: Date;
  avgFreqDays: number | null;
  daysSince: number;
};

/** Regla MVP: hoy - última > frecuencia + margen(3d). Frecuencia = promedio diffs o default vertical. */
export function computeReactivation(
  visitsByCustomer: { customerId: string; name: string; phone: string; dates: Date[] }[],
  businessType: BusinessType,
  marginDays = 3,
  now = new Date(),
): ReactivationCandidate[] {
  const def = VERTICALS[businessType]?.defaultFreqDays ?? 30;
  const out: ReactivationCandidate[] = [];
  for (const v of visitsByCustomer) {
    const sorted = [...v.dates].sort((a, b) => a.getTime() - b.getTime());
    if (sorted.length === 0) continue;
    const last = sorted[sorted.length - 1];
    let freq: number | null = null;
    if (sorted.length >= 3) {
      const diffs: number[] = [];
      for (let i = 1; i < sorted.length; i++)
        diffs.push((sorted[i].getTime() - sorted[i - 1].getTime()) / 86400000);
      freq = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    }
    const threshold = (freq ?? def) + marginDays;
    const daysSince = Math.floor((now.getTime() - last.getTime()) / 86400000);
    if (daysSince > threshold) out.push({ customerId: v.customerId, name: v.name, phone: v.phone, lastVisit: last, avgFreqDays: freq, daysSince });
  }
  return out.sort((a, b) => b.daysSince - a.daysSince);
}
