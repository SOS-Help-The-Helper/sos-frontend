'use client';

import { PartnerHeader } from './partner-header';

interface Props {
  orgName: string;
  logoUrl?: string;
}

export function PartnerHeaderClient({ orgName, logoUrl }: Props) {
  return <PartnerHeader orgName={orgName} logoUrl={logoUrl} onAgentTap={() => {}} />;
}
