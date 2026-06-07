'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from './supabase-auth';

export interface OrgSummary {
  org_id: string;
  org_name: string;
  slug: string;
}

// The org-config route may still echo supabase_url/anon_key for backward compat,
// but the frontend is pinned to the SOS DB and ignores them — org switching is a
// pure org_id context change, not a database connection change.
type OrgConfigResponse = OrgSummary;

interface MeResponse {
  authenticated: boolean;
  user: { id: string; email: string | null; phone: string | null };
  person: { id: string; display_name: string | null; email: string | null; phone: string | null } | null;
  org_id: string | null;
  org_name: string | null;
  role: string | null;
  is_admin: boolean;
  orgs: Array<{ org_id: string; org_name: string; role: string }>;
}

interface AuthContext {
  orgId: string | null;
  orgName: string | null;
  orgType: string | null;
  role: string | null;
  isAdmin: boolean;
  isPartner: boolean;
  loading: boolean;
  /** True once we know there is no signed-in user. */
  signedOut: boolean;
  /** Signed-in user's identity (from Supabase Auth + persons). */
  userEmail: string | null;
  userPhone: string | null;
  userName: string | null;
  /** All orgs available to switch between (admin only). */
  allOrgs: OrgSummary[];
  /** Switch the active org_id context (DB connection is always SOS). */
  switchOrg: (orgId: string) => void;
  /** Sign out + redirect to /login. */
  signOut: () => Promise<void>;
}

// SOS coordination view — synthetic entry, resolves to the SOS DB defaults.
const SOS_VIEW: OrgSummary = { org_id: 'sos', org_name: 'SOS (All Partners)', slug: 'sos' };

const AuthCtx = createContext<AuthContext>({
  orgId: null,
  orgName: null,
  orgType: null,
  role: null,
  isAdmin: false,
  isPartner: false,
  loading: true,
  signedOut: false,
  userEmail: null,
  userPhone: null,
  userName: null,
  allOrgs: [],
  switchOrg: () => {},
  signOut: async () => {},
});

export function useAuthContext() {
  return useContext(AuthCtx);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [allOrgs, setAllOrgs] = useState<OrgSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);

  // One stable browser auth client for the provider's lifetime.
  const supabaseRef = useRef<ReturnType<typeof createSupabaseBrowserClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createSupabaseBrowserClient();
  const supabase = supabaseRef.current;

  // Resolve a given org's identity (name/slug) and set it as the active org_id
  // context. The DB connection is always SOS — switching orgs only changes the
  // org_id parameter that api.* calls pass through.
  const resolveOrg = useCallback(async (targetOrgId: string) => {
    try {
      const res = await fetch(`/api/org-config?org_id=${encodeURIComponent(targetOrgId)}`);
      if (!res.ok) throw new Error(`org-config ${res.status}`);
      const cfg = (await res.json()) as OrgConfigResponse;
      setOrgId(cfg.org_id);
      setOrgName(cfg.org_name);
    } catch {
      // Identity lookup failed — leave the previous org context in place.
    }
  }, []);

  const switchOrg = useCallback(
    (targetOrgId: string) => {
      void resolveOrg(targetOrgId);
    },
    [resolveOrg]
  );

  // Resolve the signed-in identity → person → org, then route API calls.
  const loadSession = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { cache: 'no-store' });
      if (res.status === 401) {
        // No session.
        setSignedOut(true);
        setIsAdmin(false);
        setIsPartner(false);
        setOrgId(null);
        setOrgName(null);
        setUserEmail(null);
        setUserPhone(null);
        setUserName(null);
        setAllOrgs([]);
        setLoading(false);
        return;
      }

      const me = (await res.json()) as MeResponse;
      setSignedOut(false);
      setUserEmail(me.user?.email ?? null);
      setUserPhone(me.user?.phone ?? null);
      setUserName(me.person?.display_name ?? me.user?.email ?? me.user?.phone ?? null);
      setIsAdmin(me.is_admin);
      setRole(me.role);
      setIsPartner((me.orgs?.length ?? 0) > 0);

      if (me.org_id) {
        await resolveOrg(me.org_id);
      }
      setLoading(false);

      // Admin: load the full org list for the switcher. Non-admins get their
      // own affiliated orgs.
      if (me.is_admin) {
        try {
          const listRes = await fetch('/api/org-config');
          if (listRes.ok) {
            const { orgs } = (await listRes.json()) as { orgs: OrgSummary[] };
            setAllOrgs([SOS_VIEW, ...(orgs || [])]);
          } else {
            setAllOrgs([SOS_VIEW]);
          }
        } catch {
          setAllOrgs([SOS_VIEW]);
        }
      } else {
        setAllOrgs(
          (me.orgs || []).map((o) => ({ org_id: o.org_id, org_name: o.org_name, slug: o.org_id }))
        );
      }
    } catch {
      // Network/parse failure — fail closed to signed-out so the portal gate
      // (proxy.ts) can take over, and pages can show a session-expired message
      // instead of hanging on an empty state.
      setSignedOut(true);
      setOrgId(null);
      setLoading(false);
    }
  }, [resolveOrg]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.assign('/login');
    }
  }, [supabase]);

  // On mount: resolve the session, and react to auth changes (sign in/out).
  useEffect(() => {
    void loadSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        void loadSession();
      }
    });
    return () => subscription.unsubscribe();
  }, [loadSession, supabase]);

  // Derive a coarse org type from admin status (kept for existing consumers).
  const orgType = isAdmin ? 'admin' : isPartner ? 'partner' : null;

  const value: AuthContext = {
    orgId,
    orgName,
    orgType,
    role,
    isAdmin,
    isPartner,
    loading,
    signedOut,
    userEmail,
    userPhone,
    userName,
    allOrgs,
    switchOrg,
    signOut,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
