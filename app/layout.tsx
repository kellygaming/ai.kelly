import "./globals.css";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

const SITE_URL = "https://kellygaming.tech";
const TITLE = "KellyIA — L'IA gaming faite pour l'Afrique";
const DESCRIPTION =
  "Astuces Free Fire, PUBG Mobile, Call of Duty et plus. Génère miniatures et scripts pour tes vidéos. Sans carte bancaire : payez avec Wave, Orange Money ou MTN Mobile Money.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s — KellyIA",
  },
  description: DESCRIPTION,
  keywords: [
    "IA gaming",
    "Free Fire astuces",
    "PUBG Mobile",
    "Call of Duty Mobile",
    "miniature YouTube",
    "script TikTok",
    "IA Afrique",
    "Wave Orange Money MTN",
  ],
  authors: [{ name: "Kelly Gaming SARL" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "KellyIA",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "KellyIA" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "KellyIA",
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    description: DESCRIPTION,
    sameAs: [],
  };

  return (
    <html lang="fr">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-body bg-bg text-text">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
