import { PartnerShell } from '@/components/partner/partner-shell';
import { PartnerLayoutClient } from './layout-client';

// Hardcoded until Clerk auth is wired — ERV is the only partner
const ERV_ORG = {
  id: '3d2e8cc3-46db-4adc-b302-89b5716adfb5',
  name: 'Emergency RV',
  slug: 'erv',
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PartnerShell orgSlug={ERV_ORG.slug}>
      <PartnerLayoutClient orgId={ERV_ORG.id} orgName={ERV_ORG.name} orgSlug={ERV_ORG.slug}>
        {children}
      </PartnerLayoutClient>
    </PartnerShell>
  );
}
