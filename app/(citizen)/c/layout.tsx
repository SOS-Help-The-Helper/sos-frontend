import type { Metadata } from 'next';

type Props = {
  children: React.ReactNode;
  searchParams: { pin?: string; type?: string };
};

export async function generateMetadata({ searchParams }: { searchParams: { pin?: string; type?: string } }): Promise<Metadata> {
  const pin = searchParams?.pin;
  const type = searchParams?.type || 'request';

  if (!pin) {
    return {
      title: 'SOS | Map',
      description: 'Everyone is a helper. Find help near you.',
      openGraph: {
        title: 'SOS Connect',
        description: 'Everyone is a helper',
        images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
      },
    };
  }

  // Fetch pin data for dynamic OG
  let title = 'SOS Request';
  let description = 'View on SOS Connect map';
  let urgency = '';
  let location = '';

  try {
    const SOS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtduqguwhkczexnoawej.supabase.co';
    const SOS_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
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
      urgency = r.urgency ? ` · ${r.urgency.toUpperCase()}` : '';
      location = r.location_text ? ` · ${r.location_text}` : '';
      title = `SOS ${type === 'resource' ? 'Resource' : type === 'report' ? 'Report' : 'Request'}: ${cat}${urgency}`;
      description = r.public_display_text || r.description || `${cat} ${type}`;
      if (r.household_size) description += ` · Family of ${r.household_size}`;
      if (r.location_text) description += ` · ${r.location_text}`;
    }
  } catch { /* use defaults */ }

  const ogImageUrl = `/api/og?pin=${pin}&type=${type}`;

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

export default function CitizenMapLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
