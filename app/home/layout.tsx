import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SOS — When Systems Fail, People Don\'t',
  description: 'SOS is coordination infrastructure that connects citizens, nonprofits, government agencies, and vendors — so that when someone needs help and someone else can provide it, the connection actually happens.',
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Nunito+Sans:wght@300;400;600;700&display=swap"
        rel="stylesheet"
      />
      <link rel="preload" as="image" href="/logomark-red.svg" type="image/svg+xml" />
      {children}
    </>
  );
}
