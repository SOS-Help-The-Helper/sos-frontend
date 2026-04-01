/**
 * Loads person's active SOS records for agent context.
 * Prepended as system context so the agent knows their situation.
 */

import { supabase } from './supabase-client';

export async function getPersonContext(personId: string): Promise<string | null> {
  const { data: soses } = await supabase
    .from('soses')
    .select('id, title, status, urgency')
    .eq('person_id', personId)
    .in('status', ['active'])
    .limit(5);

  if (!soses || soses.length === 0) return null;

  const lines = soses.map(s =>
    `- SOS ${s.id.slice(0, 8)}: ${s.title || 'Untitled'} (${s.status}, ${s.urgency || 'standard'})`
  );

  return `[CONTEXT] This person has ${soses.length} active SOS record${soses.length > 1 ? 's' : ''}:\n${lines.join('\n')}`;
}
