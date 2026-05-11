export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import DrivePageClient from './drive-page-client';

export const metadata: Metadata = {
  title: 'SOS | Delivery',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DrivePage({ params }: PageProps) {
  const { id: transportId } = await params;

  const sosDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: org } = await sosDb
    .from('organizations')
    .select('id, name, slug, metadata')
    .eq('slug', 'erv')
    .maybeSingle();

  const partnerConfig = org?.metadata?.partner_config;

  let transport = null;

  if (partnerConfig?.db_url && partnerConfig?.anon_key && partnerConfig?.api_key) {
    const res = await fetch(partnerConfig.db_url + '/functions/v1/partner-read', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + partnerConfig.anon_key,
        'x-partner-key': partnerConfig.api_key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query_type: 'transport_assignments',
        filters: { id: transportId },
        limit: 1,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      transport = data.results?.[0] ?? data.assignments?.[0] ?? data[0] ?? null;
    }
  }

  if (!transport) {
    return (
      <div className="min-h-screen bg-[#0F1E2B] flex items-center justify-center">
        <p className="text-white/60 text-sm">Delivery not found</p>
      </div>
    );
  }

  return (
    <DrivePageClient
      transport={transport}
      orgName={org!.name}
      orgSlug={org!.slug}
      partnerConfig={partnerConfig}
      transportConfig={partnerConfig.transport ?? {}}
    />
  );
}
