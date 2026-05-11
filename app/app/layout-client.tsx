'use client';
import { useState } from 'react';
import { CitizenHeader } from '@/components/citizen-header';
import { SOSBottomSheet } from '@/components/sos-bottom-sheet';
import { PartnerProvider, PartnerConfig, DisasterScope } from '@/lib/partner-context';
import { AppCommandProvider, useAppCommandDispatch } from '@/lib/app-command-context';

interface PartnerLayoutClientProps {
  children: React.ReactNode;
  orgId: string;
  orgName: string;
  orgSlug: string;
  partnerConfig: PartnerConfig;
  disaster?: DisasterScope | null;
}

function PartnerLayoutInner({ children, orgName, orgSlug, disaster }: { children: React.ReactNode; orgName: string; orgSlug: string; disaster?: DisasterScope | null }) {
  const [agentOpen, setAgentOpen] = useState(false);
  const dispatch = useAppCommandDispatch();

  return (
    <>
      <CitizenHeader
        onAgentTap={() => setAgentOpen(true)}
        locationName={disaster ? disaster.name : orgName}
        status="safe"
        agentOpen={agentOpen}
      />
      {children}
      {/* @ts-expect-error onAppCommand will be wired in Phase 5 */}
      <SOSBottomSheet
        open={agentOpen}
        onClose={() => setAgentOpen(false)}
        context="partner"
        partner={orgSlug}
        onAppCommand={dispatch}
      />
    </>
  );
}

export function PartnerLayoutClient({ children, orgId, orgName, orgSlug, partnerConfig, disaster }: PartnerLayoutClientProps) {
  return (
    <PartnerProvider orgId={orgId} orgName={orgName} orgSlug={orgSlug} partnerConfig={partnerConfig} disaster={disaster}>
      <AppCommandProvider>
        <PartnerLayoutInner orgName={orgName} orgSlug={orgSlug} disaster={disaster}>
          {children}
        </PartnerLayoutInner>
      </AppCommandProvider>
    </PartnerProvider>
  );
}
