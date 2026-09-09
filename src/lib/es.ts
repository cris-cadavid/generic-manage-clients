export const STATUS_ES: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No vino",
};

export const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-zinc-200 text-zinc-600",
  NO_SHOW: "bg-red-100 text-red-700",
};

export const STATUS_BADGE: Record<string, "yellow" | "blue" | "green" | "zinc" | "red"> = {
  PENDING: "yellow",
  CONFIRMED: "blue",
  COMPLETED: "green",
  CANCELLED: "zinc",
  NO_SHOW: "red",
};

export function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
