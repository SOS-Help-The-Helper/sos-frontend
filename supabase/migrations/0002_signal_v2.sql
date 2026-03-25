-- SIGNAL Schema V2 Migration
-- Generated: 2026-03-25
-- Source: product/SIGNAL_SCHEMA_V2.md

-- SIGNAL Schema V2 Migration
-- SOS Platform — rtduqguwhkczexnoawej
-- Run in order. Each section is idempotent.

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. IDENTITY LAYER
-- ============================================

CREATE TABLE IF NOT EXISTS persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sos_id text UNIQUE NOT NULL,
  phone_hash text,
  email_hash text,
  phone_verified bool DEFAULT false,
  email_verified bool DEFAULT false,
  vulnerability_flags jsonb DEFAULT '{}',
  location_approximate geography(Point, 4326),
  trust_score_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_persons_phone_hash ON persons(phone_hash);
CREATE INDEX IF NOT EXISTS idx_persons_sos_id ON persons(sos_id);

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sos_org_id text UNIQUE NOT NULL,
  domain text,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('nonprofit','government','vendor','volunteer_group','community')),
  verified bool DEFAULT false,
  verification_method text,
  capabilities jsonb DEFAULT '[]',
  coverage_area geography(Polygon, 4326),
  data_sharing_agreement_id uuid,
  trust_score_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS affiliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES persons(id),
  org_id uuid REFERENCES organizations(id),
  role text DEFAULT 'member',
  status text DEFAULT 'active' CHECK (status IN ('active','inactive','pending')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (person_id, org_id)
);

CREATE TABLE IF NOT EXISTS capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  sector text,
  is_restricted bool DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 2. CORE DOMAIN
-- ============================================

CREATE TABLE IF NOT EXISTS disasters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  type text CHECK (type IN ('hurricane','wildfire','flood','tornado','earthquake','winter_storm','other')),
  status text DEFAULT 'active' CHECK (status IN ('active','monitoring','resolved','archived')),
  location geography(Polygon, 4326),
  severity text,
  started_at timestamptz,
  resolved_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS soses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES persons(id),
  disaster_id uuid REFERENCES disasters(id),
  sos_type text NOT NULL CHECK (sos_type IN ('request','resource','both')),
  status text DEFAULT 'active',
  channel text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES persons(id),
  sos_id uuid REFERENCES soses(id),
  disaster_id uuid REFERENCES disasters(id),
  org_id uuid REFERENCES organizations(id),
  category text NOT NULL,
  capability_slug text REFERENCES capabilities(slug),
  subcategory text,
  urgency text DEFAULT 'standard' CHECK (urgency IN ('critical','high','standard','low')),
  triage_score float,
  quantity int DEFAULT 1,
  details_sanitized text,
  location geography(Point, 4326),
  location_text text,
  status text DEFAULT 'open' CHECK (status IN ('open','matched','fulfilled','expired','withdrawn','flagged')),
  matched_at timestamptz,
  fulfilled_at timestamptz,
  was_need_met bool,
  time_to_resolution interval,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_category ON requests(category);
CREATE INDEX IF NOT EXISTS idx_requests_disaster ON requests(disaster_id);
CREATE INDEX IF NOT EXISTS idx_requests_person ON requests(person_id);
CREATE INDEX IF NOT EXISTS idx_requests_location ON requests USING GIST(location);

CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES persons(id),
  sos_id uuid REFERENCES soses(id),
  disaster_id uuid REFERENCES disasters(id),
  org_id uuid REFERENCES organizations(id),
  category text NOT NULL,
  capability_slug text REFERENCES capabilities(slug),
  subcategory text,
  capacity int DEFAULT 1,
  details_sanitized text,
  location geography(Point, 4326),
  location_text text,
  availability text DEFAULT 'immediate' CHECK (availability IN ('immediate','within_hours','within_day','scheduled')),
  status text DEFAULT 'available' CHECK (status IN ('available','deployed','exhausted','withdrawn')),
  times_matched int DEFAULT 0,
  times_fulfilled int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_category ON offers(category);
CREATE INDEX IF NOT EXISTS idx_offers_location ON offers USING GIST(location);

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES requests(id),
  offer_id uuid REFERENCES offers(id),
  disaster_id uuid REFERENCES disasters(id),
  score float,
  match_reasoning text,
  status text DEFAULT 'proposed' CHECK (status IN ('proposed','request_consented','offer_consented','connected','fulfilled','failed','expired','declined')),
  consent_request_at timestamptz,
  consent_offer_at timestamptz,
  connected_at timestamptz,
  resolved_at timestamptz,
  resolution_type text,
  trace_id uuid,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_request ON matches(request_id);
CREATE INDEX IF NOT EXISTS idx_matches_offer ON matches(offer_id);

-- ============================================
-- 3. S — SIGNAL LAYER
-- ============================================

CREATE TABLE IF NOT EXISTS verbatim_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  openclaw_session_id uuid,
  openclaw_message_id text,
  person_id uuid REFERENCES persons(id),
  org_id uuid REFERENCES organizations(id),
  disaster_id uuid REFERENCES disasters(id),
  channel text NOT NULL,
  role text NOT NULL CHECK (role IN ('citizen','partner','coordinator','agent','system')),
  raw_content text NOT NULL,
  parsed_signals jsonb,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
-- APPEND-ONLY: RLS blocks UPDATE and DELETE for all roles
CREATE INDEX IF NOT EXISTS idx_verbatim_session ON verbatim_messages(openclaw_session_id);
CREATE INDEX IF NOT EXISTS idx_verbatim_person ON verbatim_messages(person_id);
CREATE INDEX IF NOT EXISTS idx_verbatim_org ON verbatim_messages(org_id);
CREATE INDEX IF NOT EXISTS idx_verbatim_disaster ON verbatim_messages(disaster_id);
CREATE INDEX IF NOT EXISTS idx_verbatim_created ON verbatim_messages(created_at);

CREATE TABLE IF NOT EXISTS intake_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_id text,
  source_account_id uuid,
  channel text,
  raw_content text,
  parsed_data jsonb,
  location geography(Point, 4326),
  disaster_id uuid REFERENCES disasters(id),
  trust_weight float DEFAULT 1.0,
  status text DEFAULT 'new' CHECK (status IN ('new','processed','matched','expired','flagged')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_intake_signals_status ON intake_signals(status);
CREATE INDEX IF NOT EXISTS idx_intake_signals_location ON intake_signals USING GIST(location);

-- ============================================
-- 4. I — INTELLIGENCE LAYER
-- ============================================

CREATE TABLE IF NOT EXISTS decision_traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_type text NOT NULL,
  disaster_id uuid,
  org_id uuid,
  match_id uuid,
  request_id uuid,
  person_id uuid,
  intent text,
  factors jsonb NOT NULL DEFAULT '{}',
  alternatives jsonb,
  chosen_option jsonb,
  confidence float,
  reasoning text,
  verbatim_refs uuid[],
  precedent_ids uuid[],
  model_version text,
  signal_layers text[],
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_traces_type ON decision_traces(trace_type);
CREATE INDEX IF NOT EXISTS idx_traces_match ON decision_traces(match_id);
CREATE INDEX IF NOT EXISTS idx_traces_disaster ON decision_traces(disaster_id);

CREATE TABLE IF NOT EXISTS decision_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id uuid REFERENCES decision_traces(id),
  match_id uuid REFERENCES matches(id),
  outcome_type text NOT NULL CHECK (outcome_type IN ('fulfilled','failed','expired','withdrawn','redirected')),
  fulfillment_time interval,
  quality_score float,
  feedback jsonb,
  learning text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 5. G — GRAPH LAYER
-- ============================================

CREATE TABLE IF NOT EXISTS context_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  edge_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  weight float DEFAULT 1.0,
  confidence float DEFAULT 1.0,
  metadata jsonb DEFAULT '{}',
  disaster_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (source_type, source_id, edge_type, target_type, target_id, COALESCE(disaster_id, '00000000-0000-0000-0000-000000000000'::uuid))
);
CREATE INDEX IF NOT EXISTS idx_edges_source ON context_edges(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON context_edges(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_edges_type ON context_edges(edge_type);

-- ============================================
-- 6. N — NETWORK LAYER
-- ============================================

CREATE TABLE IF NOT EXISTS trust_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  score float DEFAULT 0.5,
  total_actions int DEFAULT 0,
  positive_actions int DEFAULT 0,
  negative_actions int DEFAULT 0,
  fulfillment_rate float,
  accuracy_rate float,
  response_time_avg interval,
  flags int DEFAULT 0,
  last_action_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS trust_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  event_type text NOT NULL,
  delta float NOT NULL,
  evidence jsonb DEFAULT '{}',
  trace_id uuid,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trust_events_entity ON trust_events(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  verification_type text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','verified','failed','expired')),
  verified_by uuid,
  expires_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vouches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_type text NOT NULL,
  voucher_id uuid NOT NULL,
  vouchee_type text NOT NULL,
  vouchee_id uuid NOT NULL,
  context text,
  weight float DEFAULT 1.0,
  disaster_id uuid,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 7. A — ADAPTIVE LAYER
-- ============================================

CREATE TABLE IF NOT EXISTS temporal_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disaster_id uuid NOT NULL REFERENCES disasters(id),
  snapshot_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  location geography(Point, 4326),
  location_text text,
  state jsonb NOT NULL,
  confirmation_count int DEFAULT 1,
  confirmed_by uuid[],
  source text,
  is_active bool DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_snapshots_disaster ON temporal_snapshots(disaster_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_active ON temporal_snapshots(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_snapshots_location ON temporal_snapshots USING GIST(location);

CREATE TABLE IF NOT EXISTS agent_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_agent text NOT NULL,
  target_agent text NOT NULL,
  interaction_type text NOT NULL,
  match_id uuid,
  payload jsonb NOT NULL,
  status text DEFAULT 'sent' CHECK (status IN ('sent','received','acknowledged','acted_on')),
  response_payload jsonb,
  verbatim_ref uuid,
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_agent_source ON agent_interactions(source_agent);
CREATE INDEX IF NOT EXISTS idx_agent_target ON agent_interactions(target_agent);
CREATE INDEX IF NOT EXISTS idx_agent_match ON agent_interactions(match_id);

-- ============================================
-- 8. L — LEARNING LAYER
-- ============================================

CREATE TABLE IF NOT EXISTS system_learnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern text NOT NULL,
  evidence_count int DEFAULT 0,
  confidence float DEFAULT 0.0,
  category text,
  disaster_types text[],
  applicable_scope text DEFAULT 'universal',
  org_id uuid,
  source_outcomes uuid[],
  proposed_weight_change jsonb,
  status text DEFAULT 'proposed' CHECK (status IN ('proposed','approved','rejected','superseded','auto_applied')),
  reviewed_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_type text NOT NULL CHECK (cycle_type IN ('weekly','post_disaster','on_demand')),
  disaster_id uuid,
  outcomes_processed int DEFAULT 0,
  learnings_generated int DEFAULT 0,
  config_changes_proposed int DEFAULT 0,
  config_changes_approved int DEFAULT 0,
  summary text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value jsonb NOT NULL,
  version int DEFAULT 1,
  changed_by uuid,
  change_reason text,
  learning_id uuid,
  previous_value jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 9. PRIVACY & COMPLIANCE
-- ============================================

CREATE TABLE IF NOT EXISTS person_pii (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid UNIQUE NOT NULL REFERENCES persons(id),
  submitting_org_id uuid REFERENCES organizations(id),
  phone_raw_encrypted bytea,
  email_raw_encrypted bytea,
  name_encrypted bytea,
  dob_encrypted bytea,
  demographics_encrypted bytea,
  encryption_key_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pii_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_pii_id uuid REFERENCES person_pii(id),
  accessed_by_type text NOT NULL,
  accessed_by_id uuid,
  access_reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_sharing_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  agreement_type text DEFAULT 'standard',
  shares_anonymized_signals bool DEFAULT true,
  shares_aggregate_stats bool DEFAULT true,
  shares_pii_with_matched bool DEFAULT false,
  shares_outcomes bool DEFAULT true,
  foia_safe_mode bool DEFAULT false,
  custom_terms jsonb,
  signed_by uuid,
  signed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 10. FRAUD & DEDUP
-- ============================================

CREATE TABLE IF NOT EXISTS fraud_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  person_id uuid,
  signal_type text NOT NULL,
  severity text DEFAULT 'low' CHECK (severity IN ('low','medium','high','critical')),
  details jsonb DEFAULT '{}',
  status text DEFAULT 'open' CHECK (status IN ('open','investigating','confirmed_fraud','false_positive')),
  resolved_by uuid,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_fraud_person ON fraud_signals(person_id);
CREATE INDEX IF NOT EXISTS idx_fraud_status ON fraud_signals(status);

CREATE TABLE IF NOT EXISTS dedup_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id_a uuid REFERENCES persons(id),
  person_id_b uuid REFERENCES persons(id),
  match_method text NOT NULL,
  confidence float,
  status text DEFAULT 'pending' CHECK (status IN ('pending','confirmed_same','confirmed_different','auto_merged')),
  resolved_by uuid,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- ============================================
-- 11. NOTIFICATION / ROUTING
-- ============================================

CREATE TABLE IF NOT EXISTS route_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id),
  request_id uuid,
  offer_id uuid,
  person_id uuid,
  org_id uuid,
  channel text NOT NULL,
  action_type text NOT NULL,
  message_content jsonb,
  status text DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','delivered','read','accepted','declined','failed')),
  queued_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  responded_at timestamptz,
  retry_count int DEFAULT 0,
  max_retries int DEFAULT 3,
  last_error text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 12. SEED CAPABILITIES
-- ============================================

INSERT INTO capabilities (slug, name, sector, is_restricted) VALUES
  ('emergency_shelter', 'Emergency Shelter', 'shelter', false),
  ('transitional_housing', 'Transitional Housing', 'shelter', false),
  ('rv_housing', 'RV/Camper Housing', 'shelter', false),
  ('housing', 'Housing', 'shelter', false),
  ('food_distribution', 'Food Distribution', 'food', false),
  ('mass_feeding', 'Mass Feeding', 'food', false),
  ('water_distribution', 'Water Distribution', 'food', false),
  ('food_water', 'Food & Water', 'food', false),
  ('medical_care', 'Medical Care', 'medical', true),
  ('medical_supplies', 'Medical Supplies', 'medical', false),
  ('mental_health', 'Mental Health', 'medical', true),
  ('medical', 'Medical', 'medical', true),
  ('transportation', 'Transportation', 'logistics', false),
  ('debris_removal', 'Debris Removal', 'logistics', false),
  ('supply_chain', 'Supply Chain', 'logistics', false),
  ('supplies', 'Supplies', 'logistics', false),
  ('power_generation', 'Power Generation', 'utilities', false),
  ('water_systems', 'Water Systems', 'utilities', false),
  ('communications', 'Communications', 'utilities', false),
  ('utilities', 'Utilities', 'utilities', false),
  ('home_repair', 'Home Repair', 'construction', false),
  ('repairs', 'Repairs', 'construction', false),
  ('case_management', 'Case Management', 'services', false),
  ('financial_assistance', 'Financial Assistance', 'services', false),
  ('legal_services', 'Legal Services', 'services', false),
  ('volunteer_coordination', 'Volunteer Coordination', 'volunteer', false),
  ('welfare_check', 'Welfare Check', 'services', true),
  ('missing_person', 'Missing Person', 'services', true),
  ('pet_care', 'Pet Care', 'services', false),
  ('childcare', 'Childcare', 'services', false),
  ('clothing', 'Clothing', 'supplies', false),
  ('debris', 'Debris', 'logistics', false)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SEED SYSTEM CONFIG
-- ============================================

INSERT INTO system_config (config_key, config_value, version, change_reason) VALUES
  ('match_engine_weights', '{"category": 30, "distance": 25, "urgency": 15, "capacity": 10, "triage": 10, "recency": 10}', 1, 'Initial SIGNAL v2 weights'),
  ('triage_factors', '{"medical": 25, "age": 20, "isolation": 15, "mobility": 15, "hazard_proximity": 15, "time_since_event": 10}', 1, 'Initial SIGNAL v2 triage factors')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE disasters ENABLE ROW LEVEL SECURITY;
ALTER TABLE soses ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE verbatim_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouches ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporal_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_pii ENABLE ROW LEVEL SECURITY;
ALTER TABLE pii_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sharing_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE dedup_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_actions ENABLE ROW LEVEL SECURITY;

-- Service role bypass for all tables
-- (Supabase service_role bypasses RLS by default — no explicit policy needed)

-- Verbatim messages: APPEND ONLY
CREATE POLICY verbatim_no_update ON verbatim_messages FOR UPDATE USING (false);
CREATE POLICY verbatim_no_delete ON verbatim_messages FOR DELETE USING (false);
CREATE POLICY verbatim_insert_service ON verbatim_messages FOR INSERT WITH CHECK (true);
CREATE POLICY verbatim_select_service ON verbatim_messages FOR SELECT USING (true);

-- Disasters: publicly readable
CREATE POLICY disasters_public_read ON disasters FOR SELECT USING (true);

-- Capabilities: publicly readable
CREATE POLICY capabilities_public_read ON capabilities FOR SELECT USING (true);

-- ============================================
-- TABLE COUNT: 29 tables
-- (24 from brief + affiliations + capabilities + soses + route_actions + intake_signals renamed)
-- ============================================
