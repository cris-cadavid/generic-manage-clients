import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.05)]", className)}>{children}</div>;
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">{title}</h1>
        {sub && <p className="mt-1 text-sm text-stone-500">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

const badgeStyles: Record<string, string> = {
  yellow: "bg-amber-100 text-amber-900",
  blue: "bg-sky-100 text-sky-900",
  green: "bg-emerald-100 text-emerald-900",
  zinc: "bg-stone-200 text-stone-600",
  red: "bg-red-100 text-red-800",
  orange: "bg-orange-100 text-orange-900",
};

export function Badge({ color, children }: { color: keyof typeof badgeStyles; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", badgeStyles[color])}>{children}</span>;
}

export function ErrorBanner({ message }: { message: string }) {
  return <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{message}</p>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-stone-700">
      {label}
      <span className="mt-1 block font-normal">{children}</span>
    </label>
  );
}

export const inputCls = "w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200";
export const btnPrimary = "inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700";
export const btnGold = "inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-400";
export const btnGhost = "inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-stone-600 transition hover:bg-stone-100";

export function StatCard({ icon, label, value, sub, accent }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; accent?: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className={cn("absolute inset-y-0 left-0 w-1", accent ?? "bg-stone-900")} />
      <div className="flex items-start justify-between gap-2 pl-2">
        <div>
          <p className="text-[13px] font-medium text-stone-500">{label}</p>
          <p className="mt-1 text-[26px] font-bold leading-none tracking-tight text-stone-900">{value}</p>
          {sub && <div className="mt-1.5 text-xs text-stone-500">{sub}</div>}
        </div>
        <div className="rounded-xl bg-stone-100 p-2.5 text-stone-700">{icon}</div>
      </div>
    </Card>
  );
}

export function EmptyState({ icon, title, sub, action }: { icon: ReactNode; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-stone-50/60 px-6 py-10 text-center">
      <div className="rounded-full bg-white p-3 text-stone-400 shadow-sm">{icon}</div>
      <p className="font-medium text-stone-700">{title}</p>
      {sub && <p className="max-w-sm text-sm text-stone-500">{sub}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
