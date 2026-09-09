"use client";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      title="Cerrar sesión"
      className={compact
        ? "rounded-lg p-1.5 hover:bg-stone-100"
        : "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-stone-400 transition hover:bg-white/5 hover:text-white"}
    >
      <LogOut size={18} />
      {!compact && "Cerrar sesión"}
    </button>
  );
}
