import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Org identity lookup (NOT a database routing table).
 *
 * The frontend talks to exactly one database — SOS. Org switching changes the
 * active `org_id` context only, never the DB connection. This route therefore
 * returns org identity (id / name / slug) and never surfaces any per-partner
 * `db_config` connection details.
 *
 * GET /api/org-config?org_id=<uuid>  → resolve one org's identity
 * GET /api/org-config                → list all orgs (for the admin switcher)
 *
 * supabase_url/anon_key are echoed as the SOS defaults for backward compat with
 * older callers; they are always SOS values, never partner connections.
 */

// SOS coordination view — synthetic sentinel, not a real org row.
const SOS_VIEW_ID = 'sos';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('org_id');

  const SOS_URL =
    process.env.NEXT_PUBLIC_SOS_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    '';
  const SOS_SERVICE_KEY =
    process.env.SOS_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';
  const SOS_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!SOS_URL || !SOS_SERVICE_KEY) {
    return NextResponse.json({ error: 'org routing not configured' }, { status: 500 });
  }

  const headers = {
    apikey: SOS_SERVICE_KEY,
    Authorization: `Bearer ${SOS_SERVICE_KEY}`,
  };

  // SOS coordination view — always the SOS DB defaults.
  if (orgId === SOS_VIEW_ID) {
    return NextResponse.json({
      org_id: SOS_VIEW_ID,
      org_name: 'SOS (All Partners)',
      slug: 'sos',
      supabase_url: SOS_URL,
      anon_key: SOS_ANON_KEY,
    });
  }

  // List mode — minimal summaries for the admin org switcher (no keys).
  if (!orgId) {
    try {
      const res = await fetch(
        `${SOS_URL}/rest/v1/organizations?select=id,name,slug&order=name.asc`,
        { headers }
      );
      const rows = (await res.json()) as Array<{ id: string; name: string; slug: string }>;
      const orgs = Array.isArray(rows)
        ? rows.map((o) => ({ org_id: o.id, org_name: o.name, slug: o.slug }))
        : [];
      return NextResponse.json({ orgs });
    } catch {
      return NextResponse.json({ orgs: [] }, { status: 502 });
    }
  }

  // Single org — resolve identity only. The frontend is pinned to the SOS DB,
  // so we never read or surface per-partner db_config. supabase_url/anon_key are
  // echoed as the SOS defaults purely for backward compatibility with callers
  // that still read those fields; they are always SOS, never partner values.
  const defaults = {
    org_id: orgId,
    org_name: 'SOS',
    slug: 'sos',
    supabase_url: SOS_URL,
    anon_key: SOS_ANON_KEY,
  };

  try {
    const res = await fetch(
      `${SOS_URL}/rest/v1/organizations?id=eq.${orgId}&select=id,name,slug`,
      { headers }
    );
    const rows = (await res.json()) as Array<{
      id: string;
      name: string;
      slug: string;
    }>;
    const org = Array.isArray(rows) ? rows[0] : undefined;

    // Identity only — supabase_url/anon_key stay pinned to SOS regardless of org.
    return NextResponse.json({
      ...defaults,
      ...(org ? { org_id: org.id, org_name: org.name, slug: org.slug } : {}),
    });
  } catch {
    return NextResponse.json(defaults, { status: 502 });
  }
}
