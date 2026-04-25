/**
 * Loads person's active SOS records for agent context.
 * Prepended as system context so the agent knows their situation.
 */

import { api } from './api';

export async function getPersonContext(personId: string): Promise<string | null> {
  const data = await api.ervQuery('soses', {
    person_id: personId,
    statuses: ['active'],
    limit: 5,
  }) as any;
  const soses = data?.soses ?? (Array.isArray(data) ? data : []);

  if (!soses || soses.length === 0) return null;

  const lines = soses.map((s: any) =>
    `- SOS ${s.id.slice(0, 8)}: ${s.title || 'Untitled'} (${s.status}, ${s.urgency || 'standard'})`
  );

  return `[CONTEXT] This person has ${soses.length} active SOS record${soses.length > 1 ? 's' : ''}:\n${lines.join('\n')}`;
}
