export const dynamic = 'force-dynamic';
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

  let disaster = null;
  if (disasterSlug && partnerConfig?.db_url) {
    try {
      const res = await fetch(`${partnerConfig.db_url}/functions/v1/partner-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${partnerConfig.anon_key}`,
          'x-partner-key': partnerConfig.api_key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query_type: 'disaster_summary', filters: { slug: disasterSlug } }),
      });
      const data = await res.json();
      const d = data.disasters?.find?.((d: { slug: string }) => d.slug === disasterSlug) || data.results?.[0];
      if (d) {
        disaster = { id: d.id, name: d.name, slug: d.slug || disasterSlug, lat: d.latitude ?? d.center_lat, lng: d.longitude ?? d.center_lng };
      }
    } catch (e) {
      console.error('[AppLayout] Disaster fetch error:', e);
    }
  }

  return (
    <PartnerShell orgSlug={org.slug}>
      <PartnerLayoutClient
        orgId={org.id}
        orgName={org.name}
        orgSlug={org.slug}
        partnerConfig={partnerConfig}
        disaster={disaster}
      >
        {children}
      </PartnerLayoutClient>
    </PartnerShell>
  );
}
