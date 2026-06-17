DROP TABLE IF EXISTS public.partner_waitlist CASCADE;

CREATE TABLE public.partner_waitlist (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name            text NOT NULL,
  last_name             text NOT NULL,
  email                 text NOT NULL,
  organization_name     text NOT NULL,
  organization_website  text,
  use_case              text NOT NULL,
  status                text NOT NULL DEFAULT 'new',
  source                text DEFAULT 'waitlist_landing',
  utm                   jsonb,
  user_agent            text,
  ip_hash               text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX partner_waitlist_email_uniq ON public.partner_waitlist (lower(email));
CREATE INDEX partner_waitlist_status_idx ON public.partner_waitlist (status);
CREATE INDEX partner_waitlist_created_idx ON public.partner_waitlist (created_at DESC);

CREATE OR REPLACE FUNCTION partner_waitlist_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_partner_waitlist_updated_at ON public.partner_waitlist;
CREATE TRIGGER trg_partner_waitlist_updated_at BEFORE UPDATE ON public.partner_waitlist
  FOR EACH ROW EXECUTE FUNCTION partner_waitlist_touch_updated_at();

ALTER TABLE public.partner_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_waitlist FORCE ROW LEVEL SECURITY;

COMMENT ON TABLE public.partner_waitlist IS
  'Public partner waitlist signups from /partners. Write via server-side /api/waitlist (service key); RLS denies anon. Schema matches Lovable design (ADR-008).';
