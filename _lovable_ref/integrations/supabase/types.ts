export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      _config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      affiliations: {
        Row: {
          availability: string | null
          completed_missions: number | null
          context: string | null
          created_at: string | null
          credentials: string | null
          email_verified: boolean | null
          ended_at: string | null
          id: string
          invited_by: string | null
          joined_at: string | null
          last_active_at: string | null
          notes: string | null
          org_id: string
          permissions: string[] | null
          person_id: string
          phone_verified: boolean | null
          preferences: Json | null
          referral_source: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          role: string
          service_taxonomy_code: string | null
          skills: string[] | null
          sos_affiliation_id: string | null
          started_at: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          verification_method: string | null
          verified_at: string | null
          verified_by: string | null
          volunteer_status: string | null
        }
        Insert: {
          availability?: string | null
          completed_missions?: number | null
          context?: string | null
          created_at?: string | null
          credentials?: string | null
          email_verified?: boolean | null
          ended_at?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          last_active_at?: string | null
          notes?: string | null
          org_id: string
          permissions?: string[] | null
          person_id: string
          phone_verified?: boolean | null
          preferences?: Json | null
          referral_source?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          role: string
          service_taxonomy_code?: string | null
          skills?: string[] | null
          sos_affiliation_id?: string | null
          started_at?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          verification_method?: string | null
          verified_at?: string | null
          verified_by?: string | null
          volunteer_status?: string | null
        }
        Update: {
          availability?: string | null
          completed_missions?: number | null
          context?: string | null
          created_at?: string | null
          credentials?: string | null
          email_verified?: boolean | null
          ended_at?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          last_active_at?: string | null
          notes?: string | null
          org_id?: string
          permissions?: string[] | null
          person_id?: string
          phone_verified?: boolean | null
          preferences?: Json | null
          referral_source?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          role?: string
          service_taxonomy_code?: string | null
          skills?: string[] | null
          sos_affiliation_id?: string | null
          started_at?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          verification_method?: string | null
          verified_at?: string | null
          verified_by?: string | null
          volunteer_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_events: {
        Row: {
          actor_type: string | null
          created_at: string | null
          disaster_id: string | null
          event_type: string
          from_facility_id: string | null
          from_location: string | null
          from_ops_status: string | null
          from_status: string | null
          id: string
          match_id: string | null
          metadata: Json | null
          notes: string | null
          org_id: string | null
          performed_by: string | null
          photos: Json | null
          resource_id: string
          to_facility_id: string | null
          to_location: string | null
          to_ops_status: string | null
          to_status: string | null
          transport_assignment_id: string | null
        }
        Insert: {
          actor_type?: string | null
          created_at?: string | null
          disaster_id?: string | null
          event_type: string
          from_facility_id?: string | null
          from_location?: string | null
          from_ops_status?: string | null
          from_status?: string | null
          id?: string
          match_id?: string | null
          metadata?: Json | null
          notes?: string | null
          org_id?: string | null
          performed_by?: string | null
          photos?: Json | null
          resource_id: string
          to_facility_id?: string | null
          to_location?: string | null
          to_ops_status?: string | null
          to_status?: string | null
          transport_assignment_id?: string | null
        }
        Update: {
          actor_type?: string | null
          created_at?: string | null
          disaster_id?: string | null
          event_type?: string
          from_facility_id?: string | null
          from_location?: string | null
          from_ops_status?: string | null
          from_status?: string | null
          id?: string
          match_id?: string | null
          metadata?: Json | null
          notes?: string | null
          org_id?: string | null
          performed_by?: string | null
          photos?: Json | null
          resource_id?: string
          to_facility_id?: string | null
          to_location?: string | null
          to_ops_status?: string | null
          to_status?: string | null
          transport_assignment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_events_from_facility_id_fkey"
            columns: ["from_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_events_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_events_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_events_to_facility_id_fkey"
            columns: ["to_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      disasters: {
        Row: {
          active: boolean | null
          affected_states: string[] | null
          aliases: string[] | null
          created_at: string | null
          description: string | null
          end_date: string | null
          fema_declaration: string | null
          id: string
          name: string
          response_phase: string | null
          severity_level: string | null
          slug: string | null
          sos_disaster_id: string | null
          start_date: string | null
          state: string | null
          type: string | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          active?: boolean | null
          affected_states?: string[] | null
          aliases?: string[] | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          fema_declaration?: string | null
          id?: string
          name: string
          response_phase?: string | null
          severity_level?: string | null
          slug?: string | null
          sos_disaster_id?: string | null
          start_date?: string | null
          state?: string | null
          type?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          active?: boolean | null
          affected_states?: string[] | null
          aliases?: string[] | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          fema_declaration?: string | null
          id?: string
          name?: string
          response_phase?: string | null
          severity_level?: string | null
          slug?: string | null
          sos_disaster_id?: string | null
          start_date?: string | null
          state?: string | null
          type?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: []
      }
      facilities: {
        Row: {
          address: string | null
          capacity: number | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          current_count: number | null
          disaster_id: string | null
          facility_type: string | null
          id: string
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          name: string
          org_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          current_count?: number | null
          disaster_id?: string | null
          facility_type?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          name: string
          org_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          current_count?: number | null
          disaster_id?: string | null
          facility_type?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          name?: string
          org_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facilities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          id: string
          joined_at: string | null
          left_at: string | null
          person_id: string
          relationship: string | null
        }
        Insert: {
          household_id: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          person_id: string
          relationship?: string | null
        }
        Update: {
          household_id?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          person_id?: string
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          address_hash: string
          created_at: string | null
          id: string
          location_id: string | null
          primary_person_id: string | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address_hash: string
          created_at?: string | null
          id?: string
          location_id?: string | null
          primary_person_id?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address_hash?: string
          created_at?: string | null
          id?: string
          location_id?: string | null
          primary_person_id?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "households_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "households_primary_person_id_fkey"
            columns: ["primary_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address_hash: string | null
          city: string | null
          country: string | null
          county: string | null
          created_at: string | null
          formatted_address: string | null
          geocode_confidence: number | null
          geocode_source: string | null
          id: string
          latitude: number | null
          longitude: number | null
          state: string | null
          street_address: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address_hash?: string | null
          city?: string | null
          country?: string | null
          county?: string | null
          created_at?: string | null
          formatted_address?: string | null
          geocode_confidence?: number | null
          geocode_source?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          state?: string | null
          street_address?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address_hash?: string | null
          city?: string | null
          country?: string | null
          county?: string | null
          created_at?: string | null
          formatted_address?: string | null
          geocode_confidence?: number | null
          geocode_source?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          state?: string | null
          street_address?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      match_candidates: {
        Row: {
          candidate_source: string | null
          committed_at: string | null
          committed_by: string | null
          consideration_window_ends: string | null
          created_at: string | null
          id: string
          match_id: string | null
          match_reasoning: Json | null
          match_score: number
          org_id: string | null
          partner_config: string | null
          promoted_at: string | null
          rank: number | null
          request_id: string
          resource_id: string
          status: string | null
          superseded_by: string | null
        }
        Insert: {
          candidate_source?: string | null
          committed_at?: string | null
          committed_by?: string | null
          consideration_window_ends?: string | null
          created_at?: string | null
          id?: string
          match_id?: string | null
          match_reasoning?: Json | null
          match_score?: number
          org_id?: string | null
          partner_config?: string | null
          promoted_at?: string | null
          rank?: number | null
          request_id: string
          resource_id: string
          status?: string | null
          superseded_by?: string | null
        }
        Update: {
          candidate_source?: string | null
          committed_at?: string | null
          committed_by?: string | null
          consideration_window_ends?: string | null
          created_at?: string | null
          id?: string
          match_id?: string | null
          match_reasoning?: Json | null
          match_score?: number
          org_id?: string | null
          partner_config?: string | null
          promoted_at?: string | null
          rank?: number | null
          request_id?: string
          resource_id?: string
          status?: string | null
          superseded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_candidates_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_candidates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_candidates_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_candidates_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          alternatives_considered: number | null
          auto_matched: boolean | null
          campaign_id: string | null
          candidate_id: string | null
          chain_id: string | null
          chain_role: string | null
          chain_sequence: number | null
          cleaning_cost: number | null
          committed_at: string | null
          committed_by: string | null
          connected_at: string | null
          created_at: string | null
          days_match_to_delivery: number | null
          days_request_to_match: number | null
          days_total: number | null
          decline_reason: string | null
          declined_by: string | null
          delivery_address: string | null
          delivery_date: string | null
          delivery_mileage: number | null
          delivery_notes: string | null
          delivery_photos: string[] | null
          destination_transport_cost: number | null
          disaster_id: string | null
          docs_signed: boolean | null
          family_story: string | null
          fema_pickup_confirmed: boolean | null
          fema_pickup_date: string | null
          fema_trailer_present: boolean | null
          fulfillment_chain: Json | null
          funder_name_raw: string | null
          funder_org_id: string | null
          funding_status: string | null
          id: string
          intent: string | null
          invoice_amount: number | null
          invoice_date: string | null
          learning: string | null
          learning_tags: string[] | null
          loan_end_date: string | null
          loan_extended: boolean | null
          loan_extension_reason: string | null
          loan_returned_date: string | null
          loan_start_date: string | null
          local_transport_cost: number | null
          match_reasoning: string | null
          match_score: number | null
          match_summary_masked: string | null
          match_type: string | null
          matched_by: string | null
          metadata: Json | null
          misc_delivery_cost: number | null
          outcome_at: string | null
          outcome_description: string | null
          pickup_date: string | null
          pickup_location: string | null
          provider_rating: number | null
          provider_responded_at: string | null
          provider_response: string | null
          repair_cost: number | null
          request_id: string | null
          requester_rating: number | null
          requester_responded_at: string | null
          requester_response: string | null
          resolution_type: string | null
          resolved_at: string | null
          resource_id: string | null
          resource_ids: string[] | null
          sos_match_id: string | null
          source_row: number | null
          source_sheet: string | null
          source_tab: string | null
          status: string
          survey_12mo_response: string | null
          survey_12mo_sent: string | null
          survey_1mo_response: string | null
          survey_1mo_sent: string | null
          survey_6mo_response: string | null
          survey_6mo_sent: string | null
          title_sent_date: string | null
          title_sent_to_survivor: boolean | null
          total_cost: number | null
          updated_at: string | null
          was_self_pickup: boolean | null
          was_successful: boolean | null
        }
        Insert: {
          alternatives_considered?: number | null
          auto_matched?: boolean | null
          campaign_id?: string | null
          candidate_id?: string | null
          chain_id?: string | null
          chain_role?: string | null
          chain_sequence?: number | null
          cleaning_cost?: number | null
          committed_at?: string | null
          committed_by?: string | null
          connected_at?: string | null
          created_at?: string | null
          days_match_to_delivery?: number | null
          days_request_to_match?: number | null
          days_total?: number | null
          decline_reason?: string | null
          declined_by?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          delivery_mileage?: number | null
          delivery_notes?: string | null
          delivery_photos?: string[] | null
          destination_transport_cost?: number | null
          disaster_id?: string | null
          docs_signed?: boolean | null
          family_story?: string | null
          fema_pickup_confirmed?: boolean | null
          fema_pickup_date?: string | null
          fema_trailer_present?: boolean | null
          fulfillment_chain?: Json | null
          funder_name_raw?: string | null
          funder_org_id?: string | null
          funding_status?: string | null
          id?: string
          intent?: string | null
          invoice_amount?: number | null
          invoice_date?: string | null
          learning?: string | null
          learning_tags?: string[] | null
          loan_end_date?: string | null
          loan_extended?: boolean | null
          loan_extension_reason?: string | null
          loan_returned_date?: string | null
          loan_start_date?: string | null
          local_transport_cost?: number | null
          match_reasoning?: string | null
          match_score?: number | null
          match_summary_masked?: string | null
          match_type?: string | null
          matched_by?: string | null
          metadata?: Json | null
          misc_delivery_cost?: number | null
          outcome_at?: string | null
          outcome_description?: string | null
          pickup_date?: string | null
          pickup_location?: string | null
          provider_rating?: number | null
          provider_responded_at?: string | null
          provider_response?: string | null
          repair_cost?: number | null
          request_id?: string | null
          requester_rating?: number | null
          requester_responded_at?: string | null
          requester_response?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resource_id?: string | null
          resource_ids?: string[] | null
          sos_match_id?: string | null
          source_row?: number | null
          source_sheet?: string | null
          source_tab?: string | null
          status?: string
          survey_12mo_response?: string | null
          survey_12mo_sent?: string | null
          survey_1mo_response?: string | null
          survey_1mo_sent?: string | null
          survey_6mo_response?: string | null
          survey_6mo_sent?: string | null
          title_sent_date?: string | null
          title_sent_to_survivor?: boolean | null
          total_cost?: number | null
          updated_at?: string | null
          was_self_pickup?: boolean | null
          was_successful?: boolean | null
        }
        Update: {
          alternatives_considered?: number | null
          auto_matched?: boolean | null
          campaign_id?: string | null
          candidate_id?: string | null
          chain_id?: string | null
          chain_role?: string | null
          chain_sequence?: number | null
          cleaning_cost?: number | null
          committed_at?: string | null
          committed_by?: string | null
          connected_at?: string | null
          created_at?: string | null
          days_match_to_delivery?: number | null
          days_request_to_match?: number | null
          days_total?: number | null
          decline_reason?: string | null
          declined_by?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          delivery_mileage?: number | null
          delivery_notes?: string | null
          delivery_photos?: string[] | null
          destination_transport_cost?: number | null
          disaster_id?: string | null
          docs_signed?: boolean | null
          family_story?: string | null
          fema_pickup_confirmed?: boolean | null
          fema_pickup_date?: string | null
          fema_trailer_present?: boolean | null
          fulfillment_chain?: Json | null
          funder_name_raw?: string | null
          funder_org_id?: string | null
          funding_status?: string | null
          id?: string
          intent?: string | null
          invoice_amount?: number | null
          invoice_date?: string | null
          learning?: string | null
          learning_tags?: string[] | null
          loan_end_date?: string | null
          loan_extended?: boolean | null
          loan_extension_reason?: string | null
          loan_returned_date?: string | null
          loan_start_date?: string | null
          local_transport_cost?: number | null
          match_reasoning?: string | null
          match_score?: number | null
          match_summary_masked?: string | null
          match_type?: string | null
          matched_by?: string | null
          metadata?: Json | null
          misc_delivery_cost?: number | null
          outcome_at?: string | null
          outcome_description?: string | null
          pickup_date?: string | null
          pickup_location?: string | null
          provider_rating?: number | null
          provider_responded_at?: string | null
          provider_response?: string | null
          repair_cost?: number | null
          request_id?: string | null
          requester_rating?: number | null
          requester_responded_at?: string | null
          requester_response?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resource_id?: string | null
          resource_ids?: string[] | null
          sos_match_id?: string | null
          source_row?: number | null
          source_sheet?: string | null
          source_tab?: string | null
          status?: string
          survey_12mo_response?: string | null
          survey_12mo_sent?: string | null
          survey_1mo_response?: string | null
          survey_1mo_sent?: string | null
          survey_6mo_response?: string | null
          survey_6mo_sent?: string | null
          title_sent_date?: string | null
          title_sent_to_survivor?: boolean | null
          total_cost?: number | null
          updated_at?: string | null
          was_self_pickup?: boolean | null
          was_successful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          active: boolean | null
          capabilities: string[] | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          domain: string | null
          id: string
          match_config: Json | null
          name: string
          network_role: string | null
          notes: string | null
          org_type: string | null
          parent_org_id: string | null
          relationship: string | null
          sos_org_id: string | null
          type: string
          updated_at: string | null
          verification_status: string | null
          website: string | null
        }
        Insert: {
          active?: boolean | null
          capabilities?: string[] | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          match_config?: Json | null
          name: string
          network_role?: string | null
          notes?: string | null
          org_type?: string | null
          parent_org_id?: string | null
          relationship?: string | null
          sos_org_id?: string | null
          type: string
          updated_at?: string | null
          verification_status?: string | null
          website?: string | null
        }
        Update: {
          active?: boolean | null
          capabilities?: string[] | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          match_config?: Json | null
          name?: string
          network_role?: string | null
          notes?: string | null
          org_type?: string | null
          parent_org_id?: string | null
          relationship?: string | null
          sos_org_id?: string | null
          type?: string
          updated_at?: string | null
          verification_status?: string | null
          website?: string | null
        }
        Relationships: []
      }
      person_locations: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          label: string | null
          location_id: string | null
          person_id: string
          type: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          label?: string | null
          location_id?: string | null
          person_id: string
          type?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          label?: string | null
          location_id?: string | null
          person_id?: string
          type?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_locations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      persons: {
        Row: {
          accessibility_needs: string[] | null
          alternate_phone: string | null
          consent_contact: boolean | null
          consent_data_use: boolean | null
          consent_method: string | null
          consent_share_with_partners: boolean | null
          consented_at: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          fr_type: string | null
          has_medical_needs: boolean | null
          home_region: string | null
          id: string
          is_first_responder: boolean | null
          is_single_parent: boolean | null
          is_us_citizen: boolean | null
          is_veteran: boolean | null
          last_name: string | null
          latitude: number | null
          location_id: string | null
          location_text: string | null
          longitude: number | null
          medical_summary: string | null
          military_branch: string | null
          military_status: string | null
          person_context: Json | null
          phone: string | null
          phone_canonical: string | null
          phone_hash: string | null
          sos_person_id: string | null
          trust_level: string | null
          trust_score: number | null
          updated_at: string | null
          verification_level: string | null
        }
        Insert: {
          accessibility_needs?: string[] | null
          alternate_phone?: string | null
          consent_contact?: boolean | null
          consent_data_use?: boolean | null
          consent_method?: string | null
          consent_share_with_partners?: boolean | null
          consented_at?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          fr_type?: string | null
          has_medical_needs?: boolean | null
          home_region?: string | null
          id?: string
          is_first_responder?: boolean | null
          is_single_parent?: boolean | null
          is_us_citizen?: boolean | null
          is_veteran?: boolean | null
          last_name?: string | null
          latitude?: number | null
          location_id?: string | null
          location_text?: string | null
          longitude?: number | null
          medical_summary?: string | null
          military_branch?: string | null
          military_status?: string | null
          person_context?: Json | null
          phone?: string | null
          phone_canonical?: string | null
          phone_hash?: string | null
          sos_person_id?: string | null
          trust_level?: string | null
          trust_score?: number | null
          updated_at?: string | null
          verification_level?: string | null
        }
        Update: {
          accessibility_needs?: string[] | null
          alternate_phone?: string | null
          consent_contact?: boolean | null
          consent_data_use?: boolean | null
          consent_method?: string | null
          consent_share_with_partners?: boolean | null
          consented_at?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          fr_type?: string | null
          has_medical_needs?: boolean | null
          home_region?: string | null
          id?: string
          is_first_responder?: boolean | null
          is_single_parent?: boolean | null
          is_us_citizen?: boolean | null
          is_veteran?: boolean | null
          last_name?: string | null
          latitude?: number | null
          location_id?: string | null
          location_text?: string | null
          longitude?: number | null
          medical_summary?: string | null
          military_branch?: string | null
          military_status?: string | null
          person_context?: Json | null
          phone?: string | null
          phone_canonical?: string | null
          phone_hash?: string | null
          sos_person_id?: string | null
          trust_level?: string | null
          trust_score?: number | null
          updated_at?: string | null
          verification_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "persons_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      report_snapshots: {
        Row: {
          created_at: string | null
          disaster_id: string | null
          generated_by: string | null
          id: string
          metrics: Json
          org_id: string | null
          period_end: string
          period_start: string
          report_type: string
        }
        Insert: {
          created_at?: string | null
          disaster_id?: string | null
          generated_by?: string | null
          id?: string
          metrics: Json
          org_id?: string | null
          period_end: string
          period_start: string
          report_type: string
        }
        Update: {
          created_at?: string | null
          disaster_id?: string | null
          generated_by?: string | null
          id?: string
          metrics?: Json
          org_id?: string | null
          period_end?: string
          period_start?: string
          report_type?: string
        }
        Relationships: []
      }
      requests: {
        Row: {
          accessibility_needs: Json | null
          accessibility_needs_text: string[] | null
          address_at_disaster: string | null
          admin_notes: string | null
          ai_extracted_tags: Json | null
          airs_code: string | null
          can_tow: boolean | null
          capability_slug: string | null
          case_number: string | null
          category: string | null
          category_fields: Json | null
          city: string | null
          contact_email: string | null
          contact_method: string | null
          contact_name: string | null
          contact_phone: string | null
          county: string | null
          covered_by_request_id: string | null
          created_at: string | null
          current_living_situation: string | null
          data_enriched: Json | null
          description: string | null
          details_sanitized: string | null
          disaster_id: string | null
          disaster_type: string | null
          duration_needed: string | null
          dwelling_type: string | null
          fema_amount: number | null
          fema_assistance_received: boolean | null
          fema_determination: string | null
          fema_fraud_flag: boolean | null
          fema_ia_eligible: boolean | null
          fema_notes: string | null
          fr_type: string | null
          has_children: boolean | null
          has_disabled: boolean | null
          has_elderly: boolean | null
          has_insurance: boolean | null
          has_medical_needs: boolean | null
          has_parking_location: boolean | null
          has_pets: boolean | null
          household_id: string | null
          household_size: number | null
          id: string
          intake_id: string | null
          intake_raw_text: string | null
          intake_source: string | null
          intent: string | null
          is_fema_replacement: boolean | null
          is_first_responder: boolean | null
          is_sensitive: boolean | null
          is_single_parent: boolean | null
          is_veteran: boolean | null
          latitude: number | null
          learning: string | null
          learning_tags: string[] | null
          location_description: string | null
          location_id: string | null
          location_text: string | null
          longitude: number | null
          lost_home: boolean | null
          map_visible: boolean | null
          medical_summary: string | null
          metadata: Json | null
          military_branch: string | null
          missing_fields: string[] | null
          ocha_cluster: string | null
          on_behalf_of_name: string | null
          on_behalf_of_phone: string | null
          on_behalf_of_relationship: string | null
          ops_status: string | null
          org_id: string | null
          outcome_at: string | null
          outcome_description: string | null
          outcome_quality: number | null
          owns_land: boolean | null
          parking_address: string | null
          people_and_ages: string | null
          person_id: string | null
          pet_details: string | null
          priority_score: number | null
          public_display_text: string | null
          referral_org_id: string | null
          referral_source: string | null
          rent_or_own: string | null
          requester_type: string | null
          resolution_notes: string | null
          resolution_type: string | null
          resolved_at: string | null
          rv_preference: string | null
          site_utilities: Json | null
          sos_id: string | null
          sos_request_id: string | null
          source: string | null
          source_row: number | null
          source_sheet: string | null
          source_tab: string | null
          source_type: Database["public"]["Enums"]["source_type_enum"] | null
          state: string | null
          status: string
          subcategory: string | null
          submission_type: string | null
          submitted_at: string | null
          submitted_by_person_id: string | null
          survivor_story: string | null
          taxonomy_code: string
          time_to_resolution: string | null
          title: string | null
          tow_vehicle_description: string | null
          triage_score: number | null
          updated_at: string | null
          urgency: string | null
          was_need_met: boolean | null
        }
        Insert: {
          accessibility_needs?: Json | null
          accessibility_needs_text?: string[] | null
          address_at_disaster?: string | null
          admin_notes?: string | null
          ai_extracted_tags?: Json | null
          airs_code?: string | null
          can_tow?: boolean | null
          capability_slug?: string | null
          case_number?: string | null
          category?: string | null
          category_fields?: Json | null
          city?: string | null
          contact_email?: string | null
          contact_method?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          county?: string | null
          covered_by_request_id?: string | null
          created_at?: string | null
          current_living_situation?: string | null
          data_enriched?: Json | null
          description?: string | null
          details_sanitized?: string | null
          disaster_id?: string | null
          disaster_type?: string | null
          duration_needed?: string | null
          dwelling_type?: string | null
          fema_amount?: number | null
          fema_assistance_received?: boolean | null
          fema_determination?: string | null
          fema_fraud_flag?: boolean | null
          fema_ia_eligible?: boolean | null
          fema_notes?: string | null
          fr_type?: string | null
          has_children?: boolean | null
          has_disabled?: boolean | null
          has_elderly?: boolean | null
          has_insurance?: boolean | null
          has_medical_needs?: boolean | null
          has_parking_location?: boolean | null
          has_pets?: boolean | null
          household_id?: string | null
          household_size?: number | null
          id?: string
          intake_id?: string | null
          intake_raw_text?: string | null
          intake_source?: string | null
          intent?: string | null
          is_fema_replacement?: boolean | null
          is_first_responder?: boolean | null
          is_sensitive?: boolean | null
          is_single_parent?: boolean | null
          is_veteran?: boolean | null
          latitude?: number | null
          learning?: string | null
          learning_tags?: string[] | null
          location_description?: string | null
          location_id?: string | null
          location_text?: string | null
          longitude?: number | null
          lost_home?: boolean | null
          map_visible?: boolean | null
          medical_summary?: string | null
          metadata?: Json | null
          military_branch?: string | null
          missing_fields?: string[] | null
          ocha_cluster?: string | null
          on_behalf_of_name?: string | null
          on_behalf_of_phone?: string | null
          on_behalf_of_relationship?: string | null
          ops_status?: string | null
          org_id?: string | null
          outcome_at?: string | null
          outcome_description?: string | null
          outcome_quality?: number | null
          owns_land?: boolean | null
          parking_address?: string | null
          people_and_ages?: string | null
          person_id?: string | null
          pet_details?: string | null
          priority_score?: number | null
          public_display_text?: string | null
          referral_org_id?: string | null
          referral_source?: string | null
          rent_or_own?: string | null
          requester_type?: string | null
          resolution_notes?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          rv_preference?: string | null
          site_utilities?: Json | null
          sos_id?: string | null
          sos_request_id?: string | null
          source?: string | null
          source_row?: number | null
          source_sheet?: string | null
          source_tab?: string | null
          source_type?: Database["public"]["Enums"]["source_type_enum"] | null
          state?: string | null
          status?: string
          subcategory?: string | null
          submission_type?: string | null
          submitted_at?: string | null
          submitted_by_person_id?: string | null
          survivor_story?: string | null
          taxonomy_code: string
          time_to_resolution?: string | null
          title?: string | null
          tow_vehicle_description?: string | null
          triage_score?: number | null
          updated_at?: string | null
          urgency?: string | null
          was_need_met?: boolean | null
        }
        Update: {
          accessibility_needs?: Json | null
          accessibility_needs_text?: string[] | null
          address_at_disaster?: string | null
          admin_notes?: string | null
          ai_extracted_tags?: Json | null
          airs_code?: string | null
          can_tow?: boolean | null
          capability_slug?: string | null
          case_number?: string | null
          category?: string | null
          category_fields?: Json | null
          city?: string | null
          contact_email?: string | null
          contact_method?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          county?: string | null
          covered_by_request_id?: string | null
          created_at?: string | null
          current_living_situation?: string | null
          data_enriched?: Json | null
          description?: string | null
          details_sanitized?: string | null
          disaster_id?: string | null
          disaster_type?: string | null
          duration_needed?: string | null
          dwelling_type?: string | null
          fema_amount?: number | null
          fema_assistance_received?: boolean | null
          fema_determination?: string | null
          fema_fraud_flag?: boolean | null
          fema_ia_eligible?: boolean | null
          fema_notes?: string | null
          fr_type?: string | null
          has_children?: boolean | null
          has_disabled?: boolean | null
          has_elderly?: boolean | null
          has_insurance?: boolean | null
          has_medical_needs?: boolean | null
          has_parking_location?: boolean | null
          has_pets?: boolean | null
          household_id?: string | null
          household_size?: number | null
          id?: string
          intake_id?: string | null
          intake_raw_text?: string | null
          intake_source?: string | null
          intent?: string | null
          is_fema_replacement?: boolean | null
          is_first_responder?: boolean | null
          is_sensitive?: boolean | null
          is_single_parent?: boolean | null
          is_veteran?: boolean | null
          latitude?: number | null
          learning?: string | null
          learning_tags?: string[] | null
          location_description?: string | null
          location_id?: string | null
          location_text?: string | null
          longitude?: number | null
          lost_home?: boolean | null
          map_visible?: boolean | null
          medical_summary?: string | null
          metadata?: Json | null
          military_branch?: string | null
          missing_fields?: string[] | null
          ocha_cluster?: string | null
          on_behalf_of_name?: string | null
          on_behalf_of_phone?: string | null
          on_behalf_of_relationship?: string | null
          ops_status?: string | null
          org_id?: string | null
          outcome_at?: string | null
          outcome_description?: string | null
          outcome_quality?: number | null
          owns_land?: boolean | null
          parking_address?: string | null
          people_and_ages?: string | null
          person_id?: string | null
          pet_details?: string | null
          priority_score?: number | null
          public_display_text?: string | null
          referral_org_id?: string | null
          referral_source?: string | null
          rent_or_own?: string | null
          requester_type?: string | null
          resolution_notes?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          rv_preference?: string | null
          site_utilities?: Json | null
          sos_id?: string | null
          sos_request_id?: string | null
          source?: string | null
          source_row?: number | null
          source_sheet?: string | null
          source_tab?: string | null
          source_type?: Database["public"]["Enums"]["source_type_enum"] | null
          state?: string | null
          status?: string
          subcategory?: string | null
          submission_type?: string | null
          submitted_at?: string | null
          submitted_by_person_id?: string | null
          survivor_story?: string | null
          taxonomy_code?: string
          time_to_resolution?: string | null
          title?: string | null
          tow_vehicle_description?: string | null
          triage_score?: number | null
          updated_at?: string | null
          urgency?: string | null
          was_need_met?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_covered_by_request_id_fkey"
            columns: ["covered_by_request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_sos_id_fkey"
            columns: ["sos_id"]
            isOneToOne: false
            referencedRelation: "soses"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          acquired_at: string | null
          acquisition_cost: number | null
          address: string | null
          ai_extracted_tags: Json | null
          airs_code: string | null
          allow_sell: boolean | null
          appraisal_status: string | null
          appraisal_value: number | null
          auto_reactivate: boolean | null
          available_date: string | null
          available_from: string | null
          available_hours: string | null
          available_until: string | null
          beneficiary_preference: string | null
          book_value: number | null
          book_value_80pct: number | null
          buyer_name: string | null
          campaign_id: string | null
          can_deliver: boolean | null
          capability_slug: string | null
          capacity_available: number | null
          capacity_committed: number | null
          capacity_remaining: number | null
          capacity_unit: string | null
          category: string | null
          category_fields: Json | null
          city: string | null
          comments: string | null
          concurrent_matches: number | null
          condition_notes: string | null
          condition_rating: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contents_included: string | null
          county: string | null
          coverage_area: string | null
          coverage_radius_miles: number | null
          created_at: string | null
          current_lot: string | null
          data_enriched: Json | null
          deployed_at: string | null
          description: string | null
          details_sanitized: string | null
          disaster_id: string | null
          disaster_type: string | null
          donated_by: string | null
          donated_capacity: string | null
          driver_type: string | null
          facility_id: string | null
          form_timestamp: string | null
          has_class_a: boolean | null
          has_slide: boolean | null
          hitch_type: string | null
          hours_description: string | null
          id: string
          inspection_notes: string | null
          intent: string | null
          is_ada: boolean | null
          is_paid: boolean | null
          known_repairs: string | null
          last_verified: string | null
          latitude: number | null
          lead_time_hours: number | null
          learning: string | null
          learning_tags: string[] | null
          length_ft: number | null
          location_id: string | null
          location_text: string | null
          longitude: number | null
          make: string | null
          map_visible: boolean | null
          market_rate: number | null
          max_capacity: number | null
          max_hours_week: number | null
          max_tow_weight_lbs: number | null
          medical_equipped: boolean | null
          metadata: Json | null
          missing_fields: string[] | null
          model: string | null
          needs_appraisal: boolean | null
          ocha_cluster: string | null
          ops_status: string
          org_id: string | null
          organization_name: string | null
          original_color: string | null
          outcome_at: string | null
          outcome_description: string | null
          outcome_quality: string | null
          person_id: string | null
          person_name: string | null
          person_phone: string | null
          pet_friendly: boolean | null
          phone: string | null
          price_amount: number | null
          price_tier: string | null
          price_unit: string | null
          priority_score: number | null
          rate_per_mile: number | null
          readiness_notes: string | null
          referral_source: string | null
          repairs_needed: string | null
          resolution_notes: string | null
          resolution_type: string | null
          resolved_at: string | null
          retired_at: string | null
          returned_at: string | null
          reusable: boolean | null
          rv_description: string | null
          sale_date: string | null
          sale_price: number | null
          service_radius_miles: number | null
          sleeps: number | null
          sos_id: string | null
          sos_resource_id: string | null
          source: string | null
          source_id: string | null
          source_row: number | null
          source_sheet: string | null
          source_tab: string | null
          source_type: Database["public"]["Enums"]["source_type_enum"] | null
          special_capabilities: Json | null
          staff_notes: string | null
          state: string | null
          status: string | null
          status_changed_at: string | null
          storage_timeline: string | null
          subcategory: string | null
          submitted_at: string | null
          submitted_by_person_id: string | null
          tax_receipt_eligible: boolean | null
          taxonomy_code: string
          team_size_max: number | null
          team_size_min: number | null
          times_fulfilled: number | null
          times_matched: number | null
          title_app_sent_florida: string | null
          title_app_sent_woody: string | null
          title_complete_date: string | null
          title_mailed_to: string | null
          title_status: string | null
          tow_capability: string[] | null
          updated_at: string | null
          urgency: string | null
          vehicle_type: string | null
          vin: string | null
          wants_anonymous: boolean | null
          was_need_met: boolean | null
          weight_lbs: number | null
          year: number | null
        }
        Insert: {
          acquired_at?: string | null
          acquisition_cost?: number | null
          address?: string | null
          ai_extracted_tags?: Json | null
          airs_code?: string | null
          allow_sell?: boolean | null
          appraisal_status?: string | null
          appraisal_value?: number | null
          auto_reactivate?: boolean | null
          available_date?: string | null
          available_from?: string | null
          available_hours?: string | null
          available_until?: string | null
          beneficiary_preference?: string | null
          book_value?: number | null
          book_value_80pct?: number | null
          buyer_name?: string | null
          campaign_id?: string | null
          can_deliver?: boolean | null
          capability_slug?: string | null
          capacity_available?: number | null
          capacity_committed?: number | null
          capacity_remaining?: number | null
          capacity_unit?: string | null
          category?: string | null
          category_fields?: Json | null
          city?: string | null
          comments?: string | null
          concurrent_matches?: number | null
          condition_notes?: string | null
          condition_rating?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contents_included?: string | null
          county?: string | null
          coverage_area?: string | null
          coverage_radius_miles?: number | null
          created_at?: string | null
          current_lot?: string | null
          data_enriched?: Json | null
          deployed_at?: string | null
          description?: string | null
          details_sanitized?: string | null
          disaster_id?: string | null
          disaster_type?: string | null
          donated_by?: string | null
          donated_capacity?: string | null
          driver_type?: string | null
          facility_id?: string | null
          form_timestamp?: string | null
          has_class_a?: boolean | null
          has_slide?: boolean | null
          hitch_type?: string | null
          hours_description?: string | null
          id?: string
          inspection_notes?: string | null
          intent?: string | null
          is_ada?: boolean | null
          is_paid?: boolean | null
          known_repairs?: string | null
          last_verified?: string | null
          latitude?: number | null
          lead_time_hours?: number | null
          learning?: string | null
          learning_tags?: string[] | null
          length_ft?: number | null
          location_id?: string | null
          location_text?: string | null
          longitude?: number | null
          make?: string | null
          map_visible?: boolean | null
          market_rate?: number | null
          max_capacity?: number | null
          max_hours_week?: number | null
          max_tow_weight_lbs?: number | null
          medical_equipped?: boolean | null
          metadata?: Json | null
          missing_fields?: string[] | null
          model?: string | null
          needs_appraisal?: boolean | null
          ocha_cluster?: string | null
          ops_status?: string
          org_id?: string | null
          organization_name?: string | null
          original_color?: string | null
          outcome_at?: string | null
          outcome_description?: string | null
          outcome_quality?: string | null
          person_id?: string | null
          person_name?: string | null
          person_phone?: string | null
          pet_friendly?: boolean | null
          phone?: string | null
          price_amount?: number | null
          price_tier?: string | null
          price_unit?: string | null
          priority_score?: number | null
          rate_per_mile?: number | null
          readiness_notes?: string | null
          referral_source?: string | null
          repairs_needed?: string | null
          resolution_notes?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          retired_at?: string | null
          returned_at?: string | null
          reusable?: boolean | null
          rv_description?: string | null
          sale_date?: string | null
          sale_price?: number | null
          service_radius_miles?: number | null
          sleeps?: number | null
          sos_id?: string | null
          sos_resource_id?: string | null
          source?: string | null
          source_id?: string | null
          source_row?: number | null
          source_sheet?: string | null
          source_tab?: string | null
          source_type?: Database["public"]["Enums"]["source_type_enum"] | null
          special_capabilities?: Json | null
          staff_notes?: string | null
          state?: string | null
          status?: string | null
          status_changed_at?: string | null
          storage_timeline?: string | null
          subcategory?: string | null
          submitted_at?: string | null
          submitted_by_person_id?: string | null
          tax_receipt_eligible?: boolean | null
          taxonomy_code: string
          team_size_max?: number | null
          team_size_min?: number | null
          times_fulfilled?: number | null
          times_matched?: number | null
          title_app_sent_florida?: string | null
          title_app_sent_woody?: string | null
          title_complete_date?: string | null
          title_mailed_to?: string | null
          title_status?: string | null
          tow_capability?: string[] | null
          updated_at?: string | null
          urgency?: string | null
          vehicle_type?: string | null
          vin?: string | null
          wants_anonymous?: boolean | null
          was_need_met?: boolean | null
          weight_lbs?: number | null
          year?: number | null
        }
        Update: {
          acquired_at?: string | null
          acquisition_cost?: number | null
          address?: string | null
          ai_extracted_tags?: Json | null
          airs_code?: string | null
          allow_sell?: boolean | null
          appraisal_status?: string | null
          appraisal_value?: number | null
          auto_reactivate?: boolean | null
          available_date?: string | null
          available_from?: string | null
          available_hours?: string | null
          available_until?: string | null
          beneficiary_preference?: string | null
          book_value?: number | null
          book_value_80pct?: number | null
          buyer_name?: string | null
          campaign_id?: string | null
          can_deliver?: boolean | null
          capability_slug?: string | null
          capacity_available?: number | null
          capacity_committed?: number | null
          capacity_remaining?: number | null
          capacity_unit?: string | null
          category?: string | null
          category_fields?: Json | null
          city?: string | null
          comments?: string | null
          concurrent_matches?: number | null
          condition_notes?: string | null
          condition_rating?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contents_included?: string | null
          county?: string | null
          coverage_area?: string | null
          coverage_radius_miles?: number | null
          created_at?: string | null
          current_lot?: string | null
          data_enriched?: Json | null
          deployed_at?: string | null
          description?: string | null
          details_sanitized?: string | null
          disaster_id?: string | null
          disaster_type?: string | null
          donated_by?: string | null
          donated_capacity?: string | null
          driver_type?: string | null
          facility_id?: string | null
          form_timestamp?: string | null
          has_class_a?: boolean | null
          has_slide?: boolean | null
          hitch_type?: string | null
          hours_description?: string | null
          id?: string
          inspection_notes?: string | null
          intent?: string | null
          is_ada?: boolean | null
          is_paid?: boolean | null
          known_repairs?: string | null
          last_verified?: string | null
          latitude?: number | null
          lead_time_hours?: number | null
          learning?: string | null
          learning_tags?: string[] | null
          length_ft?: number | null
          location_id?: string | null
          location_text?: string | null
          longitude?: number | null
          make?: string | null
          map_visible?: boolean | null
          market_rate?: number | null
          max_capacity?: number | null
          max_hours_week?: number | null
          max_tow_weight_lbs?: number | null
          medical_equipped?: boolean | null
          metadata?: Json | null
          missing_fields?: string[] | null
          model?: string | null
          needs_appraisal?: boolean | null
          ocha_cluster?: string | null
          ops_status?: string
          org_id?: string | null
          organization_name?: string | null
          original_color?: string | null
          outcome_at?: string | null
          outcome_description?: string | null
          outcome_quality?: string | null
          person_id?: string | null
          person_name?: string | null
          person_phone?: string | null
          pet_friendly?: boolean | null
          phone?: string | null
          price_amount?: number | null
          price_tier?: string | null
          price_unit?: string | null
          priority_score?: number | null
          rate_per_mile?: number | null
          readiness_notes?: string | null
          referral_source?: string | null
          repairs_needed?: string | null
          resolution_notes?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          retired_at?: string | null
          returned_at?: string | null
          reusable?: boolean | null
          rv_description?: string | null
          sale_date?: string | null
          sale_price?: number | null
          service_radius_miles?: number | null
          sleeps?: number | null
          sos_id?: string | null
          sos_resource_id?: string | null
          source?: string | null
          source_id?: string | null
          source_row?: number | null
          source_sheet?: string | null
          source_tab?: string | null
          source_type?: Database["public"]["Enums"]["source_type_enum"] | null
          special_capabilities?: Json | null
          staff_notes?: string | null
          state?: string | null
          status?: string | null
          status_changed_at?: string | null
          storage_timeline?: string | null
          subcategory?: string | null
          submitted_at?: string | null
          submitted_by_person_id?: string | null
          tax_receipt_eligible?: boolean | null
          taxonomy_code?: string
          team_size_max?: number | null
          team_size_min?: number | null
          times_fulfilled?: number | null
          times_matched?: number | null
          title_app_sent_florida?: string | null
          title_app_sent_woody?: string | null
          title_complete_date?: string | null
          title_mailed_to?: string | null
          title_status?: string | null
          tow_capability?: string[] | null
          updated_at?: string | null
          urgency?: string | null
          vehicle_type?: string | null
          vin?: string | null
          wants_anonymous?: boolean | null
          was_need_met?: boolean | null
          weight_lbs?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_disaster_id_fkey"
            columns: ["disaster_id"]
            isOneToOne: false
            referencedRelation: "disasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_sos_id_fkey"
            columns: ["sos_id"]
            isOneToOne: false
            referencedRelation: "soses"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_traces: {
        Row: {
          adaptive_state: Json | null
          agent_id: string
          confidence_score: number | null
          created_at: string | null
          disaster_id: string | null
          division: string | null
          entity_id: string | null
          entity_type: string | null
          extraction_date: string | null
          graph_data: Json | null
          id: string
          intelligence: string | null
          intent: string | null
          learning: string | null
          level: string | null
          message_id: string | null
          metadata: Json | null
          model_version: string | null
          network_trust: Json | null
          outcome: string | null
          parent_trace_ids: string[] | null
          reasoning: string | null
          session_id: string | null
          signal_layer: string | null
          signal_text: string | null
          sos_id: string | null
          source_db: string | null
          tags: string[] | null
          trace_type: string | null
          verbatim_excerpt: string | null
        }
        Insert: {
          adaptive_state?: Json | null
          agent_id: string
          confidence_score?: number | null
          created_at?: string | null
          disaster_id?: string | null
          division?: string | null
          entity_id?: string | null
          entity_type?: string | null
          extraction_date?: string | null
          graph_data?: Json | null
          id?: string
          intelligence?: string | null
          intent?: string | null
          learning?: string | null
          level?: string | null
          message_id?: string | null
          metadata?: Json | null
          model_version?: string | null
          network_trust?: Json | null
          outcome?: string | null
          parent_trace_ids?: string[] | null
          reasoning?: string | null
          session_id?: string | null
          signal_layer?: string | null
          signal_text?: string | null
          sos_id?: string | null
          source_db?: string | null
          tags?: string[] | null
          trace_type?: string | null
          verbatim_excerpt?: string | null
        }
        Update: {
          adaptive_state?: Json | null
          agent_id?: string
          confidence_score?: number | null
          created_at?: string | null
          disaster_id?: string | null
          division?: string | null
          entity_id?: string | null
          entity_type?: string | null
          extraction_date?: string | null
          graph_data?: Json | null
          id?: string
          intelligence?: string | null
          intent?: string | null
          learning?: string | null
          level?: string | null
          message_id?: string | null
          metadata?: Json | null
          model_version?: string | null
          network_trust?: Json | null
          outcome?: string | null
          parent_trace_ids?: string[] | null
          reasoning?: string | null
          session_id?: string | null
          signal_layer?: string | null
          signal_text?: string | null
          sos_id?: string | null
          source_db?: string | null
          tags?: string[] | null
          trace_type?: string | null
          verbatim_excerpt?: string | null
        }
        Relationships: []
      }
      soses: {
        Row: {
          all_needs_met: boolean | null
          avg_rating: number | null
          category: string | null
          channel: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          delivered_count: number | null
          description: string | null
          disaster_id: string | null
          employment_status: string | null
          fulfilled_count: number | null
          has_children: boolean | null
          has_disabled: boolean | null
          has_elderly: boolean | null
          has_pets: boolean | null
          household_size: number | null
          housing_status: string | null
          housing_type: string | null
          id: string
          income_status: string | null
          intent: string | null
          learning: string | null
          match_count: number | null
          metadata: Json | null
          organization_id: string | null
          outcome_summary: string | null
          person_id: string | null
          referral_context: string | null
          referred_by_match_id: string | null
          referred_by_org_id: string | null
          report_count: number | null
          request_count: number | null
          resolved_at: string | null
          resource_count: number | null
          sos_sos_id: string | null
          sos_type: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          all_needs_met?: boolean | null
          avg_rating?: number | null
          category?: string | null
          channel?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          delivered_count?: number | null
          description?: string | null
          disaster_id?: string | null
          employment_status?: string | null
          fulfilled_count?: number | null
          has_children?: boolean | null
          has_disabled?: boolean | null
          has_elderly?: boolean | null
          has_pets?: boolean | null
          household_size?: number | null
          housing_status?: string | null
          housing_type?: string | null
          id?: string
          income_status?: string | null
          intent?: string | null
          learning?: string | null
          match_count?: number | null
          metadata?: Json | null
          organization_id?: string | null
          outcome_summary?: string | null
          person_id?: string | null
          referral_context?: string | null
          referred_by_match_id?: string | null
          referred_by_org_id?: string | null
          report_count?: number | null
          request_count?: number | null
          resolved_at?: string | null
          resource_count?: number | null
          sos_sos_id?: string | null
          sos_type?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          all_needs_met?: boolean | null
          avg_rating?: number | null
          category?: string | null
          channel?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          delivered_count?: number | null
          description?: string | null
          disaster_id?: string | null
          employment_status?: string | null
          fulfilled_count?: number | null
          has_children?: boolean | null
          has_disabled?: boolean | null
          has_elderly?: boolean | null
          has_pets?: boolean | null
          household_size?: number | null
          housing_status?: string | null
          housing_type?: string | null
          id?: string
          income_status?: string | null
          intent?: string | null
          learning?: string | null
          match_count?: number | null
          metadata?: Json | null
          organization_id?: string | null
          outcome_summary?: string | null
          person_id?: string | null
          referral_context?: string | null
          referred_by_match_id?: string | null
          referred_by_org_id?: string | null
          report_count?: number | null
          request_count?: number | null
          resolved_at?: string | null
          resource_count?: number | null
          sos_sos_id?: string | null
          sos_type?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "soses_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_log: {
        Row: {
          created_at: string | null
          erv_id: string
          id: string
          operation: string
          payload: Json | null
          table_name: string
        }
        Insert: {
          created_at?: string | null
          erv_id: string
          id?: string
          operation: string
          payload?: Json | null
          table_name: string
        }
        Update: {
          created_at?: string | null
          erv_id?: string
          id?: string
          operation?: string
          payload?: Json | null
          table_name?: string
        }
        Relationships: []
      }
      taxonomy: {
        Row: {
          active: boolean | null
          airs_code: string | null
          aliases: string[] | null
          code: string
          created_at: string | null
          description: string | null
          domain: string | null
          id: string
          level: number | null
          match_weight: number | null
          max_match_radius_miles: number | null
          name: string
          ocha_cluster: string | null
          owner_org_id: string | null
          parent_code: string | null
          taxonomy_type: string | null
          taxonomy_usage: string | null
        }
        Insert: {
          active?: boolean | null
          airs_code?: string | null
          aliases?: string[] | null
          code: string
          created_at?: string | null
          description?: string | null
          domain?: string | null
          id?: string
          level?: number | null
          match_weight?: number | null
          max_match_radius_miles?: number | null
          name: string
          ocha_cluster?: string | null
          owner_org_id?: string | null
          parent_code?: string | null
          taxonomy_type?: string | null
          taxonomy_usage?: string | null
        }
        Update: {
          active?: boolean | null
          airs_code?: string | null
          aliases?: string[] | null
          code?: string
          created_at?: string | null
          description?: string | null
          domain?: string | null
          id?: string
          level?: number | null
          match_weight?: number | null
          max_match_radius_miles?: number | null
          name?: string
          ocha_cluster?: string | null
          owner_org_id?: string | null
          parent_code?: string | null
          taxonomy_type?: string | null
          taxonomy_usage?: string | null
        }
        Relationships: []
      }
      transport_assignments: {
        Row: {
          accepted_at: string | null
          arrived_at: string | null
          completion_notes: string | null
          convoy_id: string | null
          convoy_position: number | null
          coordinator_notes: string | null
          created_at: string | null
          current_lat: number | null
          current_lng: number | null
          delivered_at: string | null
          departed_at: string | null
          destination_contact: string | null
          destination_facility_id: string | null
          destination_lat: number | null
          destination_lng: number | null
          destination_text: string
          disaster_id: string | null
          distance_miles: number | null
          documents: Json | null
          driver_person_id: string | null
          driver_rating: number | null
          driver_vehicle: string | null
          estimated_arrival: string | null
          id: string
          issues: Json | null
          last_location_at: string | null
          last_location_update: string | null
          loaded_at: string | null
          match_id: string | null
          metadata: Json | null
          org_id: string
          origin_contact: string | null
          origin_facility_id: string | null
          origin_lat: number | null
          origin_lng: number | null
          origin_text: string
          photos: Json | null
          pickup_at: string | null
          priority: string | null
          resource_id: string
          status: string
          status_history: Json | null
          updated_at: string | null
          verified_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          arrived_at?: string | null
          completion_notes?: string | null
          convoy_id?: string | null
          convoy_position?: number | null
          coordinator_notes?: string | null
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          delivered_at?: string | null
          departed_at?: string | null
          destination_contact?: string | null
          destination_facility_id?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_text: string
          disaster_id?: string | null
          distance_miles?: number | null
          documents?: Json | null
          driver_person_id?: string | null
          driver_rating?: number | null
          driver_vehicle?: string | null
          estimated_arrival?: string | null
          id?: string
          issues?: Json | null
          last_location_at?: string | null
          last_location_update?: string | null
          loaded_at?: string | null
          match_id?: string | null
          metadata?: Json | null
          org_id: string
          origin_contact?: string | null
          origin_facility_id?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          origin_text: string
          photos?: Json | null
          pickup_at?: string | null
          priority?: string | null
          resource_id: string
          status?: string
          status_history?: Json | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          arrived_at?: string | null
          completion_notes?: string | null
          convoy_id?: string | null
          convoy_position?: number | null
          coordinator_notes?: string | null
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          delivered_at?: string | null
          departed_at?: string | null
          destination_contact?: string | null
          destination_facility_id?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_text?: string
          disaster_id?: string | null
          distance_miles?: number | null
          documents?: Json | null
          driver_person_id?: string | null
          driver_rating?: number | null
          driver_vehicle?: string | null
          estimated_arrival?: string | null
          id?: string
          issues?: Json | null
          last_location_at?: string | null
          last_location_update?: string | null
          loaded_at?: string | null
          match_id?: string | null
          metadata?: Json | null
          org_id?: string
          origin_contact?: string | null
          origin_facility_id?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          origin_text?: string
          photos?: Json | null
          pickup_at?: string | null
          priority?: string | null
          resource_id?: string
          status?: string
          status_history?: Json | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_assignments_destination_facility_id_fkey"
            columns: ["destination_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_assignments_driver_person_id_fkey"
            columns: ["driver_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_assignments_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_assignments_origin_facility_id_fkey"
            columns: ["origin_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_assignments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      source_type_enum:
        | "citizen_direct"
        | "citizen_via_org"
        | "org_owned"
        | "government"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      source_type_enum: [
        "citizen_direct",
        "citizen_via_org",
        "org_owned",
        "government",
      ],
    },
  },
} as const
