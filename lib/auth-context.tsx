'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { setOrgConfig } from './api';

export interface OrgSummary {
  org_id: string;
  org_name: string;
  slug: string;
}

interface OrgConfigResponse extends OrgSummary {
  supabase_url: string;
  anon_key: string;
}

interface AuthContext {
  orgId: string | null;
  orgName: string | null;
  orgType: string | null;
  role: string | null;
  isAdmin: boolean;
  isPartner: boolean;
  loading: boolean;
  /** Active org's resolved Supabase URL (partner DB or SOS default). */
  supabaseUrl: string | null;
  /** Active org's public anon key (safe on the client). */
  supabaseAnonKey: string | null;
  /** All orgs available to switch between (admin only). */
  allOrgs: OrgSummary[];
  /** Re-route all API calls to another org's DB. */
  switchOrg: (orgId: string) => void;
}

// Demo bypass: default to ERV org so all pages load real ERV data.
const DEMO_ORG = {
  orgId: '9ad0f2ad-7789-47a8-bfba-0ae3382c86cc', // ERV org — real data
  orgName: 'ERV',
  orgType: 'partner',
  role: 'admin',
  isAdmin: true,
  isPartner: true,
};

// SOS coordination view — synthetic entry, resolves to the SOS DB defaults.
const SOS_VIEW: OrgSummary = { org_id: 'sos', org_name: 'SOS (All Partners)', slug: 'sos' };

const AuthCtx = createContext<AuthContext>({
  ...DEMO_ORG,
  loading: true,
  supabaseUrl: null,
  supabaseAnonKey: null,
  allOrgs: [],
  switchOrg: () => {},
});

export function useAuthContext() {
  return useContext(AuthCtx);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [orgId, setOrgId] = useState<string>(DEMO_ORG.orgId);
  const [orgName, setOrgName] = useState<string>(DEMO_ORG.orgName);
  const [supabaseUrl, setSupabaseUrl] = useState<string | null>(null);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState<string | null>(null);
  const [allOrgs, setAllOrgs] = useState<OrgSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolve a given org's DB config and re-route all API calls to it.
  const resolveOrg = useCallback(async (targetOrgId: string) => {
    try {
      const res = await fetch(`/api/org-config?org_id=${encodeURIComponent(targetOrgId)}`);
      if (!res.ok) throw new Error(`org-config ${res.status}`);
      const cfg = (await res.json()) as OrgConfigResponse;
      setOrgConfig(cfg.supabase_url, cfg.anon_key);
      setOrgId(cfg.org_id);
      setOrgName(cfg.org_name);
      setSupabaseUrl(cfg.supabase_url);
      setSupabaseAnonKey(cfg.anon_key);
    } catch {
      // Leave the env-var defaults in place (api.ts falls back automatically).
    }
  }, []);

  const switchOrg = useCallback(
    (targetOrgId: string) => {
      void resolveOrg(targetOrgId);
    },
    [resolveOrg]
  );

  // On mount: resolve the demo org's DB config + (admin) load the org list.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await resolveOrg(DEMO_ORG.orgId);
      if (cancelled) return;
      setLoading(false);

      if (DEMO_ORG.isAdmin) {
        try {
          const res = await fetch('/api/org-config');
          if (res.ok) {
            const { orgs } = (await res.json()) as { orgs: OrgSummary[] };
            if (!cancelled) setAllOrgs([SOS_VIEW, ...(orgs || [])]);
          }
        } catch {
          if (!cancelled) setAllOrgs([SOS_VIEW]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolveOrg]);

  const value: AuthContext = {
    orgId,
    orgName,
    orgType: DEMO_ORG.orgType,
    role: DEMO_ORG.role,
    isAdmin: DEMO_ORG.isAdmin,
    isPartner: DEMO_ORG.isPartner,
    loading,
    supabaseUrl,
    supabaseAnonKey,
    allOrgs,
    switchOrg,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
