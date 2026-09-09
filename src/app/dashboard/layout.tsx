import { requireTenant } from "@/lib/tenant";
import { VERTICALS, type BusinessType } from "@/lib/verticals";
import DashboardShell from "@/components/dashboard-shell";
import type { OrgOpt } from "@/components/org-switcher";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { org, orgs } = await requireTenant();
  const v = VERTICALS[org.businessType as BusinessType];
  const opts: OrgOpt[] = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    icon: VERTICALS[o.businessType as BusinessType]?.icon ?? "🏢",
  }));
  return (
    <DashboardShell orgName={org.name} icon={v.icon} professionalPlural={v.professionalPlural} servicePlural={v.servicePlural} orgSlug={org.slug} orgId={org.id} orgs={opts}>
      {children}
    </DashboardShell>
  );
}
