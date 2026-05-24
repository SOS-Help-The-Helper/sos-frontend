import type { Metadata } from "next";
import Script from "next/script";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthProvider } from "@/lib/auth-context";
import { ViewProvider } from "@/lib/view-context";
import { PortalConfigProviderWrapper } from "@/lib/portal-config-wrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOS | Connect",
  description: "Everyone is a helper. A free public platform connecting people in need with helpers during disasters.",
  metadataBase: new URL('https://sosconnect.org'),
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
      <body style={{ background: 'var(--sos-light-gray, #ECEEF1)' }}>
        <ClerkProvider>
          <AuthProvider>
            <ViewProvider>
              <PortalConfigProviderWrapper>
                {children}
              </PortalConfigProviderWrapper>
            </ViewProvider>
          </AuthProvider>
        </ClerkProvider>
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
