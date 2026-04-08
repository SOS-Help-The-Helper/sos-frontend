import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { ViewProvider } from "@/lib/view-context";
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
      </head>
      <body>
        <AuthProvider>
          <ViewProvider>
            {children}
          </ViewProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
