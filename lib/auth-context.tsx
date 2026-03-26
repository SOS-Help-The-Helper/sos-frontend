'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from './supabase-client';

interface AuthContext {
  orgId: string | null;
  orgName: string | null;
  orgType: string | null;
  role: string | null;
  isAdmin: boolean;
  isPartner: boolean;
  loading: boolean;
}

const AuthCtx = createContext<AuthContext>({
  orgId: null,
  orgName: null,
  orgType: null,
  role: null,
  isAdmin: false,
  isPartner: false,
  loading: true,
});

export function useAuthContext() {
  return useContext(AuthCtx);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [ctx, setCtx] = useState<AuthContext>({
    orgId: null,
    orgName: null,
    orgType: null,
    role: null,
    isAdmin: false,
    isPartner: false,
    loading: true,
  });

  useEffect(() => {
    async function resolve() {
      if (!isLoaded) return;

      if (!user) {
        setCtx(prev => ({ ...prev, loading: false }));
        return;
      }

      // Check if user is admin (Jonathan) by email
      const email = user.primaryEmailAddress?.emailAddress;
      const isAdmin = email === 'info@sos-help.org' || email === 'jonathan@harmonyintel.com';

      if (isAdmin) {
        setCtx({
          orgId: null, // admin sees all
          orgName: 'SOS Platform',
          orgType: 'admin',
          role: 'admin',
          isAdmin: true,
          isPartner: false,
          loading: false,
        });
        return;
      }

      // Look up affiliation by clerk user ID → persons → affiliations
      // For now, check if there's a user record with this clerk ID
      const { data: userData } = await supabase
        .from('users')
        .select('id, clerk_id')
        .eq('clerk_id', user.id)
        .single();

      if (userData) {
        // Look up affiliations for this person
        const { data: affiliations } = await supabase
          .from('affiliations')
          .select('org_id, role, status')
          .eq('person_id', userData.id)
          .eq('status', 'active')
          .limit(1);

        if (affiliations && affiliations.length > 0) {
          const aff = affiliations[0];
          // Get org details
          const { data: org } = await supabase
            .from('organizations')
            .select('id, name, org_type')
            .eq('id', aff.org_id)
            .single();

          if (org) {
            setCtx({
              orgId: org.id,
              orgName: org.name,
              orgType: org.org_type,
              role: aff.role,
              isAdmin: false,
              isPartner: true,
              loading: false,
            });
            return;
          }
        }
      }

      // No affiliation found — unauthenticated partner (needs onboarding)
      setCtx({
        orgId: null,
        orgName: null,
        orgType: null,
        role: null,
        isAdmin: false,
        isPartner: false,
        loading: false,
      });
    }

    resolve();
  }, [user, isLoaded]);

  return <AuthCtx.Provider value={ctx}>{children}</AuthCtx.Provider>;
}
