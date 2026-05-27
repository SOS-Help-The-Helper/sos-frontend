import type { Metadata } from 'next';
import CitizenMapPage from './citizen-map-client';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ pin?: string; type?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const pin = params?.pin;
  const type = params?.type || 'request';

  if (!pin) {
    return {
      title: 'SOS | Map',
      description: 'Everyone is a helper. Find help near you.',
    };
  }

  let title = `SOS ${type === 'resource' ? 'Resource' : type === 'report' ? 'Report' : 'Request'}`;
  let description = 'View on SOS Connect map';

  try {
    const SOS_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
    const SOS_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const table = type === 'resource' ? 'resources' : type === 'report' ? 'reports' : 'requests';

    const res = await fetch(
      `${SOS_URL}/rest/v1/${table}?id=eq.${pin}&select=description,public_display_text,urgency,location_text,taxonomy_code,category,household_size`,
      {
        headers: { apikey: SOS_KEY, Authorization: `Bearer ${SOS_KEY}` },
        next: { revalidate: 60 },
      }
    );
    const rows = await res.json();
    if (rows?.[0]) {
      const r = rows[0];
      const cat = (r.taxonomy_code || r.category || '').replace(/\./g, ' · ');
      const urg = r.urgency ? ` · ${r.urgency.toUpperCase()}` : '';
      title = `SOS: ${cat}${urg}`;
      description = r.public_display_text || r.description || `${cat} ${type}`;
      if (r.household_size) description += ` · Family of ${r.household_size}`;
      if (r.location_text) description += ` · ${r.location_text}`;
    }
  } catch { /* use defaults */ }

  const ogImageUrl = `https://sosconnect.org/api/og?pin=${pin}&type=${type}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      type: 'website',
      siteName: 'SOS Connect',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function Page() {
  return <CitizenMapPage />;
}
