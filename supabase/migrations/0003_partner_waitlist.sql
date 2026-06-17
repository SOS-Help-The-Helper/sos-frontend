-- Partner Waitlist
-- SOS Platform — rtduqguwhkczexnoawej
-- Generated: 2026-06-17
-- Purpose: capture partner-org signups from the public waitlist landing page (/partners).
--          Public, unauthenticated form → writes via server-side /api/waitlist (service key).
--          No anon write policy; RLS denies anon by default.
-- Idempotent.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS partner_waitlist (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name        text NOT NULL,
  contact_name    text NOT NULL,
  email           text NOT NULL,
  phone           text,
  website         text,
  org_type        text,            -- e.g. nonprofit, government, faith-based, business, mutual-aid
  state           text,            -- 2-letter or region
  coverage_area   text,            -- free text: counties / regions served
  disaster_focus  text,            -- what disasters they respond to
  message         text,            -- "tell us about your org" free text
  source          text DEFAULT 'waitlist_landing',
  status          text NOT NULL DEFAULT 'new',   -- new | contacted | onboarding | converted | declined
  utm             jsonb,           -- captured utm params for attribution
  user_agent      text,
  ip_hash         text,            -- hashed, for soft dedupe / abuse signals (never raw IP)
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness on email to prevent dup signups.
CREATE UNIQUE INDEX IF NOT EXISTS partner_waitlist_email_uniq
  ON partner_waitlist (lower(email));

CREATE INDEX IF NOT EXISTS partner_waitlist_status_idx ON partner_waitlist (status);
CREATE INDEX IF NOT EXISTS partner_waitlist_created_idx ON partner_waitlist (created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION partner_waitlist_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_waitlist_updated_at ON partner_waitlist;
CREATE TRIGGER trg_partner_waitlist_updated_at
  BEFORE UPDATE ON partner_waitlist
  FOR EACH ROW EXECUTE FUNCTION partner_waitlist_touch_updated_at();

-- RLS: deny all by default. Inserts happen server-side with the service role
-- (which bypasses RLS), so we add NO anon/authenticated policies here.
ALTER TABLE partner_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_waitlist FORCE ROW LEVEL SECURITY;

COMMENT ON TABLE partner_waitlist IS
  'Public partner waitlist signups from /partners landing page. Writes via server-side /api/waitlist with service key; RLS denies anon.';
