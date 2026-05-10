import { createClient } from '@supabase/supabase-js';
import { PartnerShell } from '@/components/partner/partner-shell';
import { PartnerHeaderClient } from '@/components/partner/partner-header-client';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function fetchOrg(orgSlug: string) {
  const db = getSupabase();

  // Try slug column first
  const { data: bySlug, error: slugErr } = await db
    .from('organizations')
    .select('id, name, logo_url')
    .eq('slug', orgSlug)
    .maybeSingle();

  if (!slugErr && bySlug) return bySlug;

  // Fall back to name ilike (replace hyphens with spaces)
  const nameLike = orgSlug.replace(/-/g, ' ');
  const { data: byName } = await db
    .from('organizations')
    .select('id, name, logo_url')
    .ilike('name', nameLike)
    .maybeSingle();

  return byName ?? null;
}

export default async function PartnerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orgSlug: string };
}) {
  const org = await fetchOrg(params.orgSlug);

  if (!org) {
    return <div className="p-8 text-white">Organization not found.</div>;
  }

  return (
    <PartnerShell orgSlug={params.orgSlug}>
      <PartnerHeaderClient orgName={org.name} logoUrl={org.logo_url ?? undefined} />
      {children}
    </PartnerShell>
  );
}
