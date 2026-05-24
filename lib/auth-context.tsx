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

// Demo bypass: admin mode sees all data (no org filter)
const DEMO_CTX: AuthContext = {
  orgId: null, // null = admin view, no org filter → all data visible
  orgName: 'SOS Platform',
  orgType: 'admin',
  role: 'admin',
  isAdmin: true,
  isPartner: false,
  loading: false,
};

const AuthCtx = createContext<AuthContext>(DEMO_CTX);

export function useAuthContext() {
  return useContext(AuthCtx);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthCtx.Provider value={DEMO_CTX}>{children}</AuthCtx.Provider>;
}
