import { createClient } from '@supabase/supabase-js';
import { PartnerShell } from '@/components/partner/partner-shell';
import { PartnerLayoutClient } from './layout-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // TODO: Add auth once Clerk + proxy.ts conflict is resolved
  // For now, hardcode ERV as the default org
  const orgSlug = 'erv';

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug, metadata')
    .eq('slug', orgSlug)
    .maybeSingle();

  if (!org) {
    return <div className="flex items-center justify-center h-screen bg-[#0F1E2B] text-white text-sm">Organization not found</div>;
  }

  return (
    <PartnerShell orgSlug={orgSlug}>
      <PartnerLayoutClient orgId={org.id} orgName={org.name} orgSlug={orgSlug}>
        {children}
      </PartnerLayoutClient>
    </PartnerShell>
  );
}
