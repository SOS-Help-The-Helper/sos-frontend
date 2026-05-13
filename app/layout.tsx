import type { Metadata } from "next";
import Script from "next/script";
import { AuthProvider } from "@/lib/auth-context";
import { ViewProvider } from "@/lib/view-context";
import "./globals.css";

// Use the prod canonical when set (production), the Vercel preview URL on previews,
// and fall back to the prod canonical for local dev / unset env so OG image probes still resolve.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://sosconnect.org');

export const metadata: Metadata = {
  title: "SOS | Connect",
  description: "Everyone is a helper. A free public platform connecting people in need with helpers during disasters.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "SOS | Community Coordination",
    description: "Everyone is a helper. We help the helpers.",
    url: "https://sosconnect.org",
    siteName: "SOS",
    type: "website",
    images: [{
      url: "/opengraph-image",
      width: 1200,
      height: 630,
      alt: "SOS — Everyone is a helper",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SOS | Community Coordination",
    description: "Everyone is a helper. We help the helpers.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: "/logomark.png",
    apple: "/logomark.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, interactive-widget=resizes-content" />
        <meta name="theme-color" content="#0F1E2B" />
      </head>
      <body style={{ background: '#0F1E2B' }}>
        <AuthProvider>
          <ViewProvider>
            {children}
          </ViewProvider>
        </AuthProvider>
        {/* HubSpot Tracking Code */}
        <Script
          id="hs-script-loader"
          src="//js.hs-scripts.com/51436821.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
