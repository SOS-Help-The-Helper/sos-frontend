import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partner Waitlist — SOS | Connect',
  description:
    'Join the SOS partner waitlist. Coordinate disaster response before the storm hits — early access, onboarding support, and a dedicated agent in the tools your team already uses.',
  openGraph: {
    title: 'Partner Waitlist — SOS | Connect',
    description:
      'Coordinate disaster response before the storm hits. Join the SOS partner waitlist for early access.',
    url: 'https://sosconnect.org/partners',
    siteName: 'SOS | Connect',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
