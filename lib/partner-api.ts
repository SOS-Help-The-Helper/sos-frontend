'use client';
import { usePartnerOrg } from './partner-context';

// Hook version — for use inside components
export function usePartnerFetch() {
  const { partnerConfig } = usePartnerOrg();

  return async function partnerFetch(fn: string, body: Record<string, unknown>) {
    const res = await fetch(`${partnerConfig.db_url}/functions/v1/${fn}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${partnerConfig.anon_key}`,
        'x-partner-key': partnerConfig.api_key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      console.error(`[partnerFetch] ${fn} failed:`, data.error || res.statusText);
    }
    return data;
  };
}
