'use client';
import { createContext, useContext } from 'react';

interface PartnerOrg {
  orgId: string;
  orgName: string;
  orgSlug: string;
}

const PartnerContext = createContext<PartnerOrg>({ orgId: '', orgName: '', orgSlug: '' });

export function PartnerProvider({ children, ...org }: PartnerOrg & { children: React.ReactNode }) {
  return <PartnerContext.Provider value={org}>{children}</PartnerContext.Provider>;
}

export function usePartnerOrg() {
  return useContext(PartnerContext);
}
