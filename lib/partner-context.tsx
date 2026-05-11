'use client';
import { createContext, useContext } from 'react';

export interface PartnerConfig {
  db_url: string;
  anon_key: string;
  api_key: string;
}

interface PartnerOrg {
  orgId: string;
  orgName: string;
  orgSlug: string;
  partnerConfig: PartnerConfig;
}

const PartnerContext = createContext<PartnerOrg>({
  orgId: '',
  orgName: '',
  orgSlug: '',
  partnerConfig: { db_url: '', anon_key: '', api_key: '' },
});

export function PartnerProvider({ children, ...org }: PartnerOrg & { children: React.ReactNode }) {
  return <PartnerContext.Provider value={org}>{children}</PartnerContext.Provider>;
}

export function usePartnerOrg() {
  return useContext(PartnerContext);
}
