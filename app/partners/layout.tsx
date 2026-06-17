import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partner with SOS Connect — Join the Waitlist',
  description:
    'SOS Connect is the operating system for humanitarian response. Join the partner waitlist to bring it to your community.',
  openGraph: {
    title: 'Partner with SOS Connect',
    description:
      'Community coordination — request early access for your organization.',
    url: 'https://sosconnect.org/partners',
    siteName: 'SOS Connect',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
