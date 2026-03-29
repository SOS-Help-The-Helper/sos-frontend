/**
 * Citizen context — determines which mode to show.
 * Reads from person record, active disasters, and location.
 */

import { supabase } from '@/lib/supabase-client';

export type CitizenMode = 'peacetime' | 'watch' | 'active' | 'recovery';

export interface PersonRecord {
  id: string;
  phone_hash?: string;
  location_lat?: number;
  location_lng?: number;
  location_name?: string;
  readiness_score?: number;
  emergency_contacts?: number;
  evacuation_route?: boolean;
  go_bag?: boolean;
  pet_plan?: boolean;
}

export interface ActiveDisaster {
  id: string;
  name: string;
  status: 'active' | 'watch' | 'recovery' | 'resolved';
  disaster_type: string;
  created_at: string;
}

export interface CitizenState {
  mode: CitizenMode;
  person: PersonRecord | null;
  disaster: ActiveDisaster | null;
  activeRequestCount: number;
  activeMatchCount: number;
  hasOfferedHelp: boolean;
}

export async function getCitizenState(personId?: string): Promise<CitizenState> {
  // Check for active disasters
  const { data: disasters } = await supabase
    .from('disasters')
    .select('id, name, status, disaster_type, created_at')
    .in('status', ['active', 'watch', 'recovery'])
    .order('created_at', { ascending: false })
    .limit(1);

  const disaster = disasters?.[0] || null;

  // Determine mode from disaster status
  let mode: CitizenMode = 'peacetime';
  if (disaster) {
    if (disaster.status === 'active') mode = 'active';
    else if (disaster.status === 'watch') mode = 'watch';
    else if (disaster.status === 'recovery') mode = 'recovery';
  }

  // If we have a person ID, load their data
  let person: PersonRecord | null = null;
  let activeRequestCount = 0;
  let activeMatchCount = 0;
  let hasOfferedHelp = false;

  if (personId) {
    const { data: personData } = await supabase
      .from('persons')
      .select('*')
      .eq('id', personId)
      .single();
    person = personData;

    // Count active requests
    const { count: reqCount } = await supabase
      .from('requests')
      .select('id', { count: 'exact', head: true })
      .eq('person_id', personId)
      .in('status', ['open', 'matched']);
    activeRequestCount = reqCount || 0;

    // Count active matches
    const { count: matchCount } = await supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('person_id', personId)
      .in('status', ['proposed', 'connected']);
    activeMatchCount = matchCount || 0;

    // Check if they've offered resources
    const { count: offerCount } = await supabase
      .from('resources')
      .select('id', { count: 'exact', head: true })
      .eq('person_id', personId);
    hasOfferedHelp = (offerCount || 0) > 0;
  }

  return { mode, person, disaster, activeRequestCount, activeMatchCount, hasOfferedHelp };
}
