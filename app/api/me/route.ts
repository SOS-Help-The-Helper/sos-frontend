import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-auth-server';

/**
 * Identity resolution.
 *
 * Given the caller's Supabase Auth session (cookie-backed, SOS DB), resolve the
 * matching `persons` row, their org affiliations, and a primary org. This is the
 * bridge between the auth layer (auth.users) and the app's org model.
 *
 * Person lookup uses the SERVICE ROLE so it bypasses RLS — only the resolved,
 * client-safe summary is returned (never the service key). Phone-OTP users have
 * a `phone` and no email, so we match on either.
 *
 * GET /api/me → { authenticated, user, person, org_id, org_name, is_admin, role, orgs }
 */

function lastTen(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const SOS_URL =
    process.env.NEXT_PUBLIC_SOS_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    '';
  const SOS_SERVICE_KEY =
    process.env.SOS_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';

  const base = {
    authenticated: true as const,
    user: { id: user.id, email: user.email ?? null, phone: user.phone ?? null },
    person: null as null | Record<string, unknown>,
    org_id: null as string | null,
    org_name: null as string | null,
    role: null as string | null,
    is_admin: false,
    orgs: [] as Array<{ org_id: string; org_name: string; role: string }>,
  };

  if (!SOS_URL || !SOS_SERVICE_KEY) {
    // Auth works, but identity resolution is unconfigured — return the bare user.
    return NextResponse.json(base);
  }

  const headers = {
    apikey: SOS_SERVICE_KEY,
    Authorization: `Bearer ${SOS_SERVICE_KEY}`,
  };

  try {
    // 1) Resolve the person by email (magic-link) or phone (OTP).
    const filters: string[] = [];
    if (user.email) filters.push(`email.eq.${user.email}`);
    if (user.phone) {
      const e164 = user.phone.startsWith('+') ? user.phone : `+${user.phone}`;
      filters.push(`phone_canonical.eq.${e164}`);
      filters.push(`phone.eq.${user.phone}`);
    }
    if (filters.length === 0) return NextResponse.json(base);

    const personRes = await fetch(
      `${SOS_URL}/rest/v1/persons?or=(${filters.join(',')})&select=id,display_name,email,phone,phone_canonical&limit=5`,
      { headers, cache: 'no-store' }
    );
    let people = (await personRes.json()) as Array<{
      id: string;
      display_name: string | null;
      email: string | null;
      phone: string | null;
      phone_canonical: string | null;
    }>;
    if (!Array.isArray(people)) people = [];

    // Prefer an exact phone match (last 10 digits) for OTP sign-ins where the
    // stored phone formatting may be inconsistent.
    let person = people[0];
    if (user.phone && people.length > 1) {
      const want = lastTen(user.phone);
      person =
        people.find(
          (p) =>
            (p.phone_canonical && lastTen(p.phone_canonical) === want) ||
            (p.phone && lastTen(p.phone) === want)
        ) || person;
    }

    if (!person) return NextResponse.json(base);
    base.person = person;

    // 2) Affiliations → orgs + admin role.
    const affRes = await fetch(
      `${SOS_URL}/rest/v1/affiliations?person_id=eq.${person.id}&select=org_id,role,status`,
      { headers, cache: 'no-store' }
    );
    let affs = (await affRes.json()) as Array<{
      org_id: string;
      role: string | null;
      status: string | null;
    }>;
    if (!Array.isArray(affs)) affs = [];

    // Keep active (or status-less) affiliations with an org.
    const active = affs.filter(
      (a) => a.org_id && (!a.status || ['active', 'verified', 'approved'].includes(a.status))
    );
    const usable = active.length ? active : affs.filter((a) => a.org_id);

    const isAdmin = usable.some((a) => (a.role || '').toLowerCase() === 'admin');
    base.is_admin = isAdmin;

    // Primary org: first admin affiliation, else first affiliation.
    const primary = usable.find((a) => (a.role || '').toLowerCase() === 'admin') || usable[0];

    if (primary) {
      base.org_id = primary.org_id;
      base.role = primary.role ?? null;

      // 3) Resolve org names for the affiliated orgs.
      const ids = Array.from(new Set(usable.map((a) => a.org_id)));
      const orgRes = await fetch(
        `${SOS_URL}/rest/v1/organizations?id=in.(${ids.join(',')})&select=id,name`,
        { headers, cache: 'no-store' }
      );
      let orgRows = (await orgRes.json()) as Array<{ id: string; name: string }>;
      if (!Array.isArray(orgRows)) orgRows = [];
      const nameById = new Map(orgRows.map((o) => [o.id, o.name]));

      base.org_name = nameById.get(primary.org_id) ?? null;
      base.orgs = usable.map((a) => ({
        org_id: a.org_id,
        org_name: nameById.get(a.org_id) ?? a.org_id,
        role: a.role ?? 'member',
      }));
    }

    return NextResponse.json(base);
  } catch {
    return NextResponse.json(base, { status: 200 });
  }
}
