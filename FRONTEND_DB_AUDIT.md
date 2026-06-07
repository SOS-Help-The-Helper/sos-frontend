# Frontend DB Audit — "SOS DB Only" Compliance

**Date:** 2026-06-07
**Auditor:** Claude (Henry)
**Scope:** Frontend data layer (`lib/api.ts`, `lib/auth-context.tsx`, `app/api/org-config/route.ts`, and every file that touches DB connection config).

## The Rule

> **ALL frontend data must come from the SOS DB only. Org switching changes `org_id`
> context, NOT the database connection.**

Concretely:

- There is exactly **one** database the frontend ever talks to: SOS.
- Edge-function calls and PostgREST reads always use the SOS URL + SOS anon key.
- "Which org am I looking at" is a **parameter** (`org_id` in the EF body / a `.eq('...org_id', ...)` filter), never a different connection string, anon key, or `x-partner-key`.
- Per-partner `db_url` / `anon_key` / `api_key` (a.k.a. `db_config` / `partner_config`) must **not** drive any frontend fetch.

The current code implements a **multi-tenant DB-routing** model that directly contradicts this: org switching swaps the live Supabase connection to the partner's own database. That is the root violation; everything below is an instance of it.

---

## Summary of Findings

| # | Severity | File | What it does | Status |
|---|----------|------|--------------|--------|
| V1 | 🔴 Critical | `lib/api.ts:37–42` | `setOrgConfig()` repoints EF base URL, anon key, and the PostgREST read client to the partner DB | Live |
| V2 | 🔴 Critical | `lib/api.ts:28–30, 75–94` | Mutable per-org `efBaseUrl`/`efAnonKey`; `efCall` ≠ SOS by design (the `sosEfCall` split exists precisely because `efCall` can point elsewhere) | Live |
| V3 | 🔴 Critical | `lib/auth-context.tsx:102–115` | `resolveOrg()` calls `setOrgConfig(cfg.supabase_url, cfg.anon_key)` on every org switch; stores per-org URL/key in context | Live |
| V4 | 🔴 Critical | `app/api/org-config/route.ts:83–117` | Reads `organizations.db_config` and returns a **per-partner** `supabase_url` + `anon_key` to the client — this is the routing table the rule forbids | Live |
| V5 | 🟠 High | `lib/partner-api.ts:8–23` | `usePartnerFetch()` fetches `partnerConfig.db_url/functions/v1/...` with the partner's `anon_key` + `x-partner-key` | Dead (latent) |
| V6 | 🟠 High | `lib/partner-context.tsx:4–8, 26–31` | `PartnerConfig { db_url, anon_key, api_key }` — the context shape itself encodes a per-org DB connection | Dead (latent) |
| V7 | 🟠 High | `app/drive/[id]/drive-page-client.tsx:233–340` | Three direct `fetch(partnerConfig.db_url + ...)` calls with `x-partner-key` | Dead (not imported) |

**Verified clean** (always SOS, no per-org switching): `lib/supabase-client.ts`, `lib/supabase.ts`, `app/api/agent/chat/route.ts`, `app/api/chat-history/route.ts`, `app/drive/[id]/page.tsx` (the live driver page — uses `api.transport*`, so it inherits V1/V2 but has no direct partner-DB fetch of its own).

---

## Detailed Findings & Fixes

### V1 — `setOrgConfig` swaps the live DB connection 🔴

**`lib/api.ts:37–42`**

```ts
export function setOrgConfig(url: string, anonKey: string) {
  efBaseUrl = `${url || DEFAULT_URL}/functions/v1`;
  efAnonKey = anonKey || DEFAULT_ANON_KEY;
  // Rebuild the direct-read client so db.* / crmMatchesList hit the active DB.
  supabaseRead = createClient(url || DEFAULT_URL, anonKey || DEFAULT_ANON_KEY);
}
```

**Why it violates the rule:** This is the literal "change the database connection on org switch" the rule prohibits. After a partner is selected, every `efCall(...)` and every `db.*` / `crmMatchesList` read hits the **partner's** Supabase project instead of SOS.

**Fix:** `setOrgConfig` must never accept/apply a partner URL or key. Either delete it, or reduce it to recording the active `org_id` only (the EF body already carries `org_id`). The connection stays pinned to SOS:

```ts
// Connection is permanently SOS. Org scope travels as a parameter, not a URL.
const efBaseUrl = `${SOS_URL}/functions/v1`;   // const, never reassigned
const efAnonKey = SOS_ANON_KEY;                 // const, never reassigned
const supabaseRead = createClient(SOS_URL, SOS_ANON_KEY); // const, never rebuilt

// If callers still import setOrgConfig, make it a no-op (or have it set only an
// in-memory activeOrgId used to default the org_id param):
export function setOrgConfig(_url?: string, _anonKey?: string) { /* no DB switch */ }
```

---

### V2 — `efCall` is a per-org connection, `sosEfCall` is the "real SOS" escape hatch 🔴

**`lib/api.ts:28–30, 75–94`**

```ts
let efBaseUrl = `${DEFAULT_URL}/functions/v1`;   // mutated by setOrgConfig
let efAnonKey = DEFAULT_ANON_KEY;                 // mutated by setOrgConfig
...
async function efCall(...)    { return callEf(efBaseUrl, efAnonKey, ...); }  // ACTIVE org DB
async function sosEfCall(...)  { return callEf(SOS_BASE_URL, SOS_ANON_KEY, ...); } // forced SOS
```

**Why it violates the rule:** The existence of two callers — one "active org" and one "forced SOS" — proves `efCall` is *not* guaranteed to hit SOS. Under the rule there is only one DB, so the distinction is meaningless and dangerous: the ~70 `api.*` wrappers built on `efCall` will follow the partner connection once V1 fires.

**Fix:** Collapse the two. `efBaseUrl`/`efAnonKey` become immutable SOS constants (see V1), so `efCall` and `sosEfCall` are identical. Keep one (`efCall`); alias or remove `sosEfCall`. No `api.*` wrapper changes are required — they already pass `org_id` in the body, which is the correct (and now only) scoping mechanism.

---

### V3 — Auth context repoints the DB on every org switch 🔴

**`lib/auth-context.tsx:102–115`**

```ts
const cfg = (await res.json()) as OrgConfigResponse;
setOrgConfig(cfg.supabase_url, cfg.anon_key);   // ← switches the DB connection
setOrgId(cfg.org_id);
setOrgName(cfg.org_name);
setSupabaseUrl(cfg.supabase_url);               // ← stores per-org connection in context
setSupabaseAnonKey(cfg.anon_key);
```

`switchOrg(orgId)` → `resolveOrg(orgId)` runs this on every admin org switch and on initial session load (line 153).

**Why it violates the rule:** Org switching is supposed to change `org_id` context only. Here it changes the connection (`setOrgConfig`) and exposes per-org URL/key through the context (`supabaseUrl`/`supabaseAnonKey`, consumed by the org switcher in `components/shell/top-nav.tsx`).

**Fix:**
- Drop the `setOrgConfig(cfg.supabase_url, cfg.anon_key)` call. Keep only `setOrgId(cfg.org_id)` (+ name).
- `supabaseUrl`/`supabaseAnonKey` in the context should be the constant SOS values (or removed entirely if no longer needed). They must not vary by org.
- `switchOrg` becomes "set the active `org_id`" — that's it. All subsequent `api.*` calls already pass that `org_id`.

---

### V4 — `org-config` route hands the client a per-partner connection 🔴

**`app/api/org-config/route.ts:83–117`**

```ts
const res = await fetch(
  `${SOS_URL}/rest/v1/organizations?id=eq.${orgId}&select=id,name,slug,db_config`, { headers });
...
const cfg = org.db_config;
return NextResponse.json({
  org_id: org.id, org_name: org.name, slug: org.slug,
  supabase_url: cfg.supabase_url || SOS_URL,   // ← per-partner DB URL to the client
  anon_key: cfg.anon_key || SOS_ANON_KEY,      // ← per-partner anon key to the client
});
```

**Why it violates the rule:** The route's own header comment calls it "the routing table" that maps org → a different database. That mapping is exactly what the rule forbids. The client receives a partner `supabase_url`/`anon_key` and (via V1/V3) connects there. The route correctly withholds `service_role_key`, but the *non-secret* URL+anon are still a forbidden cross-DB connection.

**Fix:** Stop reading/returning `db_config`. Return identity metadata only; if the response shape must stay stable for callers, return the **SOS** URL + anon for every org so nothing ever repoints:

```ts
const res = await fetch(
  `${SOS_URL}/rest/v1/organizations?id=eq.${orgId}&select=id,name,slug`, { headers });
const org = Array.isArray(rows) ? rows[0] : undefined;
return NextResponse.json({
  org_id: org?.id ?? orgId,
  org_name: org?.name ?? 'SOS',
  slug: org?.slug ?? 'sos',
  supabase_url: SOS_URL,     // always SOS
  anon_key: SOS_ANON_KEY,    // always SOS
});
```

The `db_config` column can remain in the DB for backend/EF use, but the frontend-facing route must never surface it. (List mode at lines 58–72 is already clean — `select=id,name,slug`, no keys.)

---

### V5 — `usePartnerFetch` calls the partner DB directly 🟠 (dead code, latent)

**`lib/partner-api.ts:8–23`**

```ts
const res = await fetch(`${partnerConfig.db_url}/functions/v1/${fn}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${partnerConfig.anon_key}`,
    'x-partner-key': partnerConfig.api_key,
    ...
```

**Why it violates the rule:** Bypasses SOS entirely — talks straight to `partnerConfig.db_url` with the partner's anon key and `x-partner-key`. This is the most direct possible violation.

**Status:** Currently **unused** — `PartnerProvider` is never mounted, so `usePartnerOrg().partnerConfig` is always the empty default. Latent, but it's a ready-made footgun.

**Fix:** Delete `lib/partner-api.ts`, or rewrite it to call SOS EFs via `api.efCall(fn, { org_id, ...body })`. There is no legitimate reason for the frontend to hold `db_url`/`api_key`.

---

### V6 — `PartnerConfig` shape encodes a per-org connection 🟠 (dead code, latent)

**`lib/partner-context.tsx:4–8, 26–31`**

```ts
export interface PartnerConfig {
  db_url: string;
  anon_key: string;
  api_key: string;
}
...
partnerConfig: { db_url: '', anon_key: '', api_key: '' },
```

**Why it violates the rule:** The type itself says "an org carries its own DB URL + anon key + partner API key." That is the multi-tenant-DB model the rule rejects. Anything consuming it (V5, V7) is forced into a cross-DB call.

**Status:** Provider unused (no `PartnerProvider` mount anywhere in `app/`).

**Fix:** Remove `PartnerConfig` and the `partnerConfig` field. If a partner-scope context is still wanted, reduce it to `{ orgId, orgName, orgSlug, disaster? }` — identity only. Or delete `lib/partner-context.tsx` entirely and standardize on `useAuthContext()`.

---

### V7 — Driver page client fetches the partner DB directly 🟠 (dead code, not imported)

**`app/drive/[id]/drive-page-client.tsx:233, 306, 333`**

```ts
fetch(partnerConfig.db_url + '/functions/v1/partner-update', {
  headers: {
    Authorization: 'Bearer ' + partnerConfig.anon_key,
    'x-partner-key': partnerConfig.api_key,
    ...
```

**Why it violates the rule:** Same as V5 — direct partner-DB writes for GPS tracking, status, and issue reports.

**Status:** **Not imported anywhere.** The live route is `app/drive/[id]/page.tsx`, which uses `api.transportUpdateStatus` / `api.transportUpdateLocation` / `api.transportReportIssue` (SOS-routable EF calls — clean once V1/V2 land). `drive-page-client.tsx` is stale and should not ship.

**Fix:** Delete `app/drive/[id]/drive-page-client.tsx`. The functionality it duplicates already exists, correctly routed, in `page.tsx`.

---

## Verified Clean (no action needed)

| File | Why it's compliant |
|------|--------------------|
| `lib/supabase-client.ts` | Hard-pinned to `NEXT_PUBLIC_SUPABASE_URL` + anon (SOS). No org switching. |
| `lib/supabase.ts` | Service-role admin client, **server-side only**, pinned to `SUPABASE_URL`. Not exposed to the client. |
| `app/api/agent/chat/route.ts` | Pinned SOS URL + anon. |
| `app/api/chat-history/route.ts` | Pinned `SUPABASE_URL` + service role (server only). |
| `app/api/org-config/route.ts` list mode (`:58–72`) | Selects `id,name,slug` only — no keys leaked. |
| `app/drive/[id]/page.tsx` | Uses `api.transport*` (EF), no direct partner-DB fetch. Becomes fully clean after V1/V2. |

---

## Remediation Order

Do them in this order so the live path is locked down before cleaning up dead code:

1. **V4** — Make `/api/org-config` return SOS URL/anon for every org (stop reading `db_config`). This cuts off the *source* of partner connection strings.
2. **V1 + V2** — Pin `efBaseUrl`/`efAnonKey`/`supabaseRead` to SOS constants; neuter `setOrgConfig`; collapse `sosEfCall` into `efCall`.
3. **V3** — Strip the `setOrgConfig(url, key)` call from `resolveOrg`; `switchOrg` sets `org_id` only; make context `supabaseUrl`/`supabaseAnonKey` constant SOS (or remove).
4. **V5 / V6 / V7** — Delete the dead partner-DB-fetch modules (`lib/partner-api.ts`, `lib/partner-context.tsx`, `app/drive/[id]/drive-page-client.tsx`) or rewrite to SOS-EF + `org_id`.

After these, the only DB any frontend code can reach is SOS, and `org_id` is the sole org-scoping mechanism — matching the rule.

### Post-fix invariant check (suggested grep guards)

```bash
# Should return NOTHING in app/ lib/ components/ after remediation:
grep -rn "db_url\|db_config\|x-partner-key\|partner_config\|partnerConfig" app lib components
# setOrgConfig must take no DB-switching args (or not exist):
grep -rn "setOrgConfig(" lib app
# org-config route must not select db_config:
grep -n "db_config" app/api/org-config/route.ts
```

---

## Note (out of scope, worth filing)

`.env.example` documents only `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, but the app relies on `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and optionally `NEXT_PUBLIC_SOS_SUPABASE_URL`. Once the SOS-only model is enforced, `NEXT_PUBLIC_SOS_SUPABASE_URL` is redundant with `NEXT_PUBLIC_SUPABASE_URL` and can be dropped. Update `.env.example` accordingly.
