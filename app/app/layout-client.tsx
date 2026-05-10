'use client';
import { useState } from 'react';
import { CitizenHeader } from '@/components/citizen-header';
import { SOSBottomSheet } from '@/components/sos-bottom-sheet';
import { PartnerProvider } from '@/lib/partner-context';

interface PartnerLayoutClientProps {
  children: React.ReactNode;
  orgId: string;
  orgName: string;
  orgSlug: string;
}

export function PartnerLayoutClient({ children, orgId, orgName, orgSlug }: PartnerLayoutClientProps) {
  const [agentOpen, setAgentOpen] = useState(false);

  return (
    <PartnerProvider orgId={orgId} orgName={orgName} orgSlug={orgSlug}>
      <CitizenHeader
        onAgentTap={() => setAgentOpen(true)}
        locationName={orgName}
        status="safe"
        agentOpen={agentOpen}
      />
      {children}
      <SOSBottomSheet
        open={agentOpen}
        onClose={() => setAgentOpen(false)}
        context="partner"
        partner={orgSlug}
      />
    </PartnerProvider>
  );
}
