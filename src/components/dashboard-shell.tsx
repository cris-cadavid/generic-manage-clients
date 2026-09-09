"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, Users, Scissors, HandMetal,
  ShoppingBag, Package, Megaphone, UsersRound, Settings, CalendarPlus, X, Menu, ArrowDownUp, Bot,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import PushButton from "@/components/push-button";
import LogoutButton from "@/components/logout-button";

export type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

function buildNav(professionalPlural: string, servicePlural: string): NavItem[] {
  return [
    { href: "/dashboard", label: "Resumen", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/agenda", label: "Agenda", icon: CalendarDays },
    { href: "/dashboard/clientes", label: "Clientes", icon: Users },
    { href: "/dashboard/servicios", label: servicePlural, icon: Scissors },
    { href: "/dashboard/staff", label: professionalPlural, icon: HandMetal },
    { href: "/dashboard/ventas", label: "Ventas", icon: ShoppingBag },
    { href: "/dashboard/inventario", label: "Inventario", icon: Package },
    { href: "/dashboard/reactivar", label: "Reactivar", icon: Megaphone },
    { href: "/dashboard/importar", label: "Importar", icon: ArrowDownUp },
    { href: "/dashboard/api", label: "IA conectada", icon: Bot },
    { href: "/dashboard/equipo", label: "Equipo", icon: UsersRound },
    { href: "/dashboard/config", label: "Ajustes", icon: Settings },
  ];
}

function Sidebar({ orgName, icon, nav, orgSlug, onNav }: { orgName: string; icon: string; nav: NavItem[]; orgSlug: string; onNav?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col bg-ink-950 text-stone-200">
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-xl shadow-lg shadow-amber-500/20">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate font-bold leading-tight text-white">{orgName}</p>
          <p className="text-xs font-medium tracking-wide text-amber-400/90">VUELVE · clientes que regresan</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {nav.map((n) => {
          const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
          const Icon = n.icon;
          return (
            <Link key={n.href} href={n.href} onClick={onNav}
              className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                active ? "bg-amber-400 font-semibold text-stone-950 shadow-md shadow-amber-500/20" : "text-stone-300 hover:bg-white/5 hover:text-white")}>
              <Icon size={18} strokeWidth={active ? 2.4 : 2} />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-2 p-4">
        <Link href={`/book/${orgSlug}`} target="_blank"
          className="flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 px-3 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-400/10">
          <CalendarPlus size={16} /> Link de reservas
        </Link>
        <LogoutButton />
        <p className="text-center text-[11px] text-stone-500">WhatsApp directo · sin API oficial</p>
      </div>
    </div>
  );
}

export default function DashboardShell({ orgName, icon, professionalPlural, servicePlural, orgSlug, orgId, children }: { orgName: string; icon: string; professionalPlural: string; servicePlural: string; orgSlug: string; orgId: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const nav = buildNav(professionalPlural, servicePlural);
  return (
    <div className="min-h-screen lg:flex">
      <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 hover:bg-stone-100" aria-label="Abrir menú"><Menu size={22} /></button>
        <p className="truncate text-sm font-bold">{icon} {orgName}</p>
        <div className="flex items-center gap-1">
          <PushButton orgId={orgId} />
          <LogoutButton compact />
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw]">
            <button onClick={() => setOpen(false)} className="absolute right-2 top-2 z-10 rounded-lg p-1.5 text-stone-400 hover:bg-white/10" aria-label="Cerrar"><X size={20} /></button>
            <Sidebar orgName={orgName} icon={icon} nav={nav} orgSlug={orgSlug} onNav={() => setOpen(false)} />
          </div>
        </div>
      )}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">
        <Sidebar orgName={orgName} icon={icon} nav={nav} orgSlug={orgSlug} />
      </aside>
      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 hidden items-center justify-end gap-3 border-b border-stone-200/70 bg-[#f6f4ef]/85 px-8 py-2.5 backdrop-blur lg:flex">
          <PushButton orgId={orgId} />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">{children}</div>
      </div>
    </div>
  );
}
