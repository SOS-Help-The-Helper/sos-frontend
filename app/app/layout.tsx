import { auth, currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { PartnerShell } from '@/components/partner/partner-shell';
import { PartnerLayoutClient } from './layout-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  
  if (!user) {
    redirect('/join?redirect=/app');
  }

  // Org slug from Clerk user metadata
  const orgSlug = (user.publicMetadata as any)?.orgSlug || (user.unsafeMetadata as any)?.orgSlug;
  
  if (!orgSlug) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0F1E2B] text-white text-sm text-center px-8">
        <div>
          <p className="text-lg font-medium mb-2">No organization assigned</p>
          <p className="text-white/50">Contact your SOS administrator to get access.</p>
        </div>
      </div>
    );
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug, metadata')
    .eq('slug', orgSlug)
    .maybeSingle();

  if (!org) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0F1E2B] text-white text-sm">
        Organization not found
      </div>
    );
  }

  return (
    <PartnerShell orgSlug={orgSlug}>
      <PartnerLayoutClient orgId={org.id} orgName={org.name} orgSlug={orgSlug}>
        {children}
      </PartnerLayoutClient>
    </PartnerShell>
  );
}
