import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SOS | Coordination Platform',
  description:
    'See the SOS coordination platform in action — from instant case creation to AI-driven matching across the full disaster relief lifecycle.',
  openGraph: {
    type: 'website',
    url: 'https://sosconnect.org/coordination',
    title: 'SOS | Coordination Platform',
    description:
      'A demo of the SOS coordination platform — connecting citizens, nonprofits, and emergency services across the full relief lifecycle.',
    siteName: 'SOS',
    images: [{ url: 'https://sosconnect.org/og-image.png?v=2', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SOS | Coordination Platform',
    description: 'A demo of the SOS coordination platform.',
    images: ['https://sosconnect.org/og-image.png?v=2'],
  },
};

export default function CoordinationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Nunito+Sans:wght@300;400;600;700&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
