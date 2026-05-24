'use client';

import { createContext, useContext } from 'react';

interface AuthContext {
  orgId: string | null;
  orgName: string | null;
  orgType: string | null;
  role: string | null;
  isAdmin: boolean;
  isPartner: boolean;
  loading: boolean;
}

// Demo bypass: default to ERV org so all pages load real ERV data
const DEMO_CTX: AuthContext = {
  orgId: '9ad0f2ad-7789-47a8-bfba-0ae3382c86cc', // ERV org — real data
  orgName: 'ERV',
  orgType: 'partner',
  role: 'admin',
  isAdmin: true,
  isPartner: true,
  loading: false,
};

const AuthCtx = createContext<AuthContext>(DEMO_CTX);

export function useAuthContext() {
  return useContext(AuthCtx);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthCtx.Provider value={DEMO_CTX}>{children}</AuthCtx.Provider>;
}
