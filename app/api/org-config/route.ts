import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Org → database routing table.
 *
 * This route ALWAYS runs against the SOS DB — it IS the routing table. The
 * `organizations.db_config` JSONB column holds each partner's own Supabase
 * connection ({ supabase_url, anon_key, service_role_key, project_ref }).
 *
 * GET /api/org-config?org_id=<uuid>  → resolve one org's client-safe DB config
 * GET /api/org-config                → list all orgs (for the admin switcher)
 *
 * SECURITY: the service_role_key from db_config is NEVER returned to the client.
 * Only the partner's public anon_key + url are sent down. When an org has no
 * db_config we fall back to the SOS DB defaults (backward compatible).
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

  // Single org — resolve its DB config.
  const defaults = {
    org_id: orgId,
    org_name: 'SOS',
    slug: 'sos',
    supabase_url: SOS_URL,
    anon_key: SOS_ANON_KEY,
  };

  try {
    const res = await fetch(
      `${SOS_URL}/rest/v1/organizations?id=eq.${orgId}&select=id,name,slug,db_config`,
      { headers }
    );
    const rows = (await res.json()) as Array<{
      id: string;
      name: string;
      slug: string;
      db_config: {
        supabase_url?: string;
        anon_key?: string;
        service_role_key?: string;
        project_ref?: string;
      } | null;
    }>;
    const org = Array.isArray(rows) ? rows[0] : undefined;

    // Unknown org or no per-partner DB → SOS DB defaults (backward compatible).
    if (!org || !org.db_config) {
      return NextResponse.json({
        ...defaults,
        ...(org ? { org_id: org.id, org_name: org.name, slug: org.slug } : {}),
      });
    }

    const cfg = org.db_config;
    return NextResponse.json({
      org_id: org.id,
      org_name: org.name,
      slug: org.slug,
      // db_config.service_role_key is intentionally omitted — server-side only.
      supabase_url: cfg.supabase_url || SOS_URL,
      anon_key: cfg.anon_key || SOS_ANON_KEY,
    });
  } catch {
    return NextResponse.json(defaults, { status: 502 });
  }
}
