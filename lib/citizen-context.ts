/**
 * Citizen context — determines which mode to show.
 * Reads from person record, active disasters, and location.
 */

import { api } from '@/lib/api';

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
  const disasterData = await api.ervQuery('disasters', {
    statuses: ['active', 'watch', 'recovery'],
    limit: 1,
  }) as any;
  const disasters: ActiveDisaster[] = disasterData?.disasters ?? (Array.isArray(disasterData) ? disasterData : []);
  const disaster = disasters[0] || null;

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
    const personData = await api.ervQuery('person', { person_id: personId }) as any;
    person = personData?.person ?? personData ?? null;

    const reqData = await api.queryMatches({
      person_id: personId,
      statuses: ['open', 'matched'],
      count: true,
    }) as any;
    activeRequestCount = reqData?.count || 0;

    const matchData = await api.queryMatches({
      person_id: personId,
      statuses: ['proposed', 'connected'],
      count: true,
    }) as any;
    activeMatchCount = matchData?.count || 0;

    const offerData = await api.queryInventory({
      person_id: personId,
      count: true,
    }) as any;
    hasOfferedHelp = (offerData?.count || 0) > 0;
  }

  return { mode, person, disaster, activeRequestCount, activeMatchCount, hasOfferedHelp };
}
