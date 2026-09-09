"use client";
import { switchOrg } from "@/lib/org-actions";
import { ChevronsUpDown } from "lucide-react";

export type OrgOpt = { id: string; name: string; icon: string };

export default function OrgSwitcher({ orgs, currentId, dark = false }: { orgs: OrgOpt[]; currentId: string; dark?: boolean }) {
  if (orgs.length <= 1) {
    return <p className={`truncate text-sm font-bold ${dark ? "text-white" : ""}`}>{orgs[0]?.icon} {orgs[0]?.name}</p>;
  }
  return (
    <form action={switchOrg} className="relative min-w-0">
      <select
        name="orgId"
        defaultValue={currentId}
        onChange={(e) => e.target.form?.requestSubmit()}
        title="Cambiar de negocio"
        className={dark
          ? "w-full appearance-none truncate rounded-xl bg-white/5 py-1.5 pl-2 pr-7 text-sm font-bold text-white outline-none transition hover:bg-white/10"
          : "max-w-44 truncate rounded-lg border border-stone-300 bg-white px-1.5 py-1 text-sm font-bold outline-none"}
      >
        {orgs.map((o) => <option key={o.id} value={o.id}>{o.icon} {o.name}</option>)}
      </select>
      {dark && <ChevronsUpDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" />}
    </form>
  );
}
