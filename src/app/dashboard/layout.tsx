import { requireTenant } from "@/lib/tenant";
import { VERTICALS, type BusinessType } from "@/lib/verticals";
import DashboardShell from "@/components/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { org } = await requireTenant();
  const v = VERTICALS[org.businessType as BusinessType];
  return (
    <DashboardShell orgName={org.name} icon={v.icon} professionalPlural={v.professionalPlural} servicePlural={v.servicePlural} orgSlug={org.slug} orgId={org.id}>
      {children}
    </DashboardShell>
  );
}
