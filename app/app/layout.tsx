import { createClient } from '@supabase/supabase-js';
import { PartnerShell } from '@/components/partner/partner-shell';
import { PartnerLayoutClient } from './layout-client';

export default async function AppLayout({
  children,
  searchParams,
}: {
  children: React.ReactNode;
  searchParams: Promise<{ org?: string; disaster?: string }>;
}) {
  const params = await searchParams;
  const orgSlug = params.org || 'erv';
  const disasterSlug = params.disaster || null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug, metadata')
    .eq('slug', orgSlug)
    .maybeSingle();

  if (!org) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F1E2B] text-white">
        Partner organization not found
      </div>
    );
  }

  const partnerConfig = org.metadata?.partner_config || {};

  return (
    <PartnerShell orgSlug={org.slug}>
      <PartnerLayoutClient
        orgId={org.id}
        orgName={org.name}
        orgSlug={org.slug}
        partnerConfig={partnerConfig}
        disasterSlug={disasterSlug}
      >
        {children}
      </PartnerLayoutClient>
    </PartnerShell>
  );
}
