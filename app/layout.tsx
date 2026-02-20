import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { jsonLd } from './metadata';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

// ─── AGGRESSIVE SEO METADATA ──────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL('https://autocityqatar.com'),

  title: {
    default: 'Car Accessories Qatar | Auto Parts Doha | Auto City Qatar – 3 Branches',
    template: '%s | Auto City Qatar – Car Accessories Doha',
  },

  description: 'Auto City Qatar: #1 car accessories shop in Doha. Genuine OEM parts, aftermarket accessories, window tinting, car stereo upgrades, vehicle facelifts & interior upgrades. 3 branches in Al Gharafa, Muaither & Al Mesila. Call +974 5086 7676.',

  keywords: [
    // Primary
    'car accessories Qatar',
    'car accessories Doha',
    'auto accessories Qatar',
    'auto parts Qatar',
    'car parts Qatar',
    'car parts Doha',
    'auto parts Doha',
    'vehicle accessories Qatar',
    // Services
    'window tinting Qatar',
    'window tinting Doha',
    'car stereo upgrade Qatar',
    'car audio Doha',
    'vehicle facelift Qatar',
    'car interior upgrade Qatar',
    'car exterior accessories Qatar',
    'ceramic coating Qatar',
    'car detailing Doha',
    'PPF paint protection film Qatar',
    'vehicle type conversion Qatar',
    'car modification Qatar',
    'car customization Doha',
    // Parts
    'genuine car parts Qatar',
    'OEM car parts Qatar',
    'OEM parts Doha',
    'aftermarket car parts Qatar',
    'aftermarket parts Doha',
    'spare parts Qatar',
    // Locations
    'car accessories Al Gharafa',
    'car accessories Muaither',
    'car accessories Al Mesila',
    'auto shop Doha',
    'auto city Qatar',
    'car accessories shop Qatar',
    // Brands
    'Pioneer stereo Qatar',
    'JBL car audio Qatar',
    'Sony car stereo Doha',
    'Kenwood car audio Qatar',
    'Alpine car audio Doha',
    // Long-tail
    'best car accessories shop Qatar',
    'where to buy car parts in Qatar',
    'car audio system installation Doha',
    'car interior modification Qatar',
    'LED car lights Qatar',
    'dash cam installation Qatar',
    'car seat covers Qatar',
    'alloy wheels Qatar',
    'car stereo Doha',
    'automotive services Doha',
  ],

  authors: [{ name: 'Auto City Qatar', url: 'https://autocityqatar.com' }],
  creator: 'Auto City Qatar',
  publisher: 'Auto City Qatar',

  formatDetection: {
    email: true,
    address: true,
    telephone: true,
  },

  manifest: '/manifest.json',

  appleWebApp: {
    capable: true,
    title: 'Auto City Qatar – Car Accessories Doha',
    statusBarStyle: 'black-translucent',
  },

  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/icons/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },

  openGraph: {
    type: 'website',
    locale: 'en_QA',
    alternateLocale: ['ar_QA'],
    url: 'https://autocityqatar.com',
    siteName: 'Auto City Qatar',
    title: 'Car Accessories Qatar | Auto City – Doha\'s #1 Auto Parts Store',
    description: 'Shop genuine OEM parts, aftermarket accessories, car stereo upgrades, window tinting & vehicle facelifts at Auto City Qatar. 3 Doha branches: Al Gharafa, Muaither & Al Mesila. Call +974 5086 7676.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Auto City Qatar – Car Accessories & Auto Parts Shop in Doha Qatar | 3 Branches',
        type: 'image/jpeg',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    site: '@autocityqatar',
    creator: '@autocityqatar',
    title: 'Car Accessories Qatar | Auto City – Doha\'s #1 Auto Parts Store',
    description: '3 Doha branches. Genuine OEM parts, stereo upgrades, window tinting, vehicle facelifts & interior upgrades. Qatar\'s most trusted car accessories shop.',
    images: ['/og-image.jpg'],
  },

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  alternates: {
    canonical: 'https://autocityqatar.com',
    languages: {
      'en-QA': 'https://autocityqatar.com/en',
      'ar-QA': 'https://autocityqatar.com/ar',
      'x-default': 'https://autocityqatar.com',
    },
  },

  verification: {
    google: 'your-google-verification-code', // ← Replace with Google Search Console code
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },

  category: 'Automotive',
  classification: 'Car Accessories, Auto Parts, Automotive Services, Qatar',

  other: {
    // Open Graph extended (Facebook local business)
    'contact:phone_number': '+974 5086 7676',
    'contact:email': 'info@autocityqatar.com',
    'business:contact_data:locality': 'Doha',
    'business:contact_data:region': 'Ad Dawhah',
    'business:contact_data:country_name': 'Qatar',
    'business:contact_data:phone_number': '+974 5086 7676',
    'business:contact_data:website': 'https://autocityqatar.com',

    // Geo meta tags — critical for local SEO & Google Maps association
    'geo.region': 'QA-DA',
    'geo.placename': 'Doha, Qatar',
    'geo.position': '25.2854;51.5310',
    'ICBM': '25.2854, 51.5310',

    // Additional Open Graph locality
    'og:locality': 'Doha',
    'og:region': 'Ad Dawhah',
    'og:country-name': 'Qatar',
    'og:phone_number': '+974 5086 7676',
    'og:email': 'info@autocityqatar.com',

    // Crawler directives
    'rating': 'general',
    'revisit-after': '3 days',
    'language': 'English, Arabic',
    'coverage': 'Qatar, Doha, Al Gharafa, Muaither, Al Mesila',
    'distribution': 'local',
    'target': 'all',
  },
};

// ─── ROOT LAYOUT ──────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" style={{ backgroundColor: '#000000' }}>
      <head>
        {/* ── JSON-LD: Injected BEFORE page paint for fastest indexing ── */}
        {/* Using dangerouslySetInnerHTML in a <script> tag (not Next.js Script)
            ensures it appears in the initial HTML and not deferred */}
        <script
          id="json-ld-schema"
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* ── PWA / Theme ── */}
        <meta name="theme-color" content="#E84545" />
        <meta name="msapplication-TileColor" content="#E84545" />
        <meta name="msapplication-TileImage" content="/icons/icon-144.png" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* ── Preconnect for performance (Core Web Vitals → ranking signal) ── */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* ── DNS prefetch for external resources ── */}
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />

        {/* ── Canonical reinforcement (belt + suspenders with Next.js metadata) ── */}
        <link rel="canonical" href="https://autocityqatar.com" />

        {/* ── Hreflang (belt + suspenders) ── */}
        <link rel="alternate" hrefLang="en-QA" href="https://autocityqatar.com/en" />
        <link rel="alternate" hrefLang="ar-QA" href="https://autocityqatar.com/ar" />
        <link rel="alternate" hrefLang="x-default" href="https://autocityqatar.com" />

        {/* ── Structured Data: Local Business (inline, immediate) ── */}
        <script
          id="json-ld-local"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': ['AutoPartsStore', 'LocalBusiness'],
              name: 'Auto City Qatar',
              alternateName: 'اوتو سيتي قطر',
              url: 'https://autocityqatar.com',
              logo: 'https://autocityqatar.com/login.png',
              image: 'https://autocityqatar.com/og-image.jpg',
              description: "Qatar's #1 car accessories shop in Doha. Genuine OEM parts, aftermarket accessories, car stereo upgrades, window tinting, vehicle facelifts. 3 branches: Al Gharafa, Muaither, Al Mesila.",
              telephone: '+974-5086-7676',
              email: 'info@autocityqatar.com',
              priceRange: '$$',
              currenciesAccepted: 'QAR',
              paymentAccepted: 'Cash, Credit Card',
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Doha',
                addressRegion: 'Ad Dawhah',
                addressCountry: 'QA',
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: 25.2854,
                longitude: 51.5310,
              },
              openingHoursSpecification: [
                {
                  '@type': 'OpeningHoursSpecification',
                  dayOfWeek: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
                  opens: '08:00',
                  closes: '20:00',
                },
                {
                  '@type': 'OpeningHoursSpecification',
                  dayOfWeek: 'Friday',
                  opens: '14:00',
                  closes: '20:00',
                },
              ],
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                reviewCount: '200',
                bestRating: '5',
                worstRating: '1',
              },
              hasMap: 'https://maps.google.com/?q=Auto+City+Qatar+Doha',
              areaServed: [
                { '@type': 'City', name: 'Doha' },
                { '@type': 'City', name: 'Al Gharafa' },
                { '@type': 'City', name: 'Muaither' },
                { '@type': 'City', name: 'Al Mesila' },
                { '@type': 'Country', name: 'Qatar' },
              ],
              contactPoint: [
                { '@type': 'ContactPoint', telephone: '+974-5086-7676', contactType: 'customer service', areaServed: 'QA', availableLanguage: ['English', 'Arabic'] },
                { '@type': 'ContactPoint', telephone: '+974-6664-2884', contactType: 'customer service', areaServed: 'QA', availableLanguage: ['English', 'Arabic'] },
                { '@type': 'ContactPoint', telephone: '+974-7730-3968', contactType: 'customer service', areaServed: 'QA', availableLanguage: ['English', 'Arabic'] },
              ],
              sameAs: [
                // Add social profiles when live:
                // 'https://www.facebook.com/autocityqatar',
                // 'https://www.instagram.com/autocityqatar',
                // 'https://twitter.com/autocityqatar',
              ],
            }),
          }}
        />

        {/* ── Google Tag Manager (add your GTM ID) ── */}
        {/* Replace GTM-XXXXXXX with your actual GTM container ID */}
        {/*
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-XXXXXXX');`}
        </Script>
        */}
      </head>

      <body className={`${inter.className} bg-black`} style={{ backgroundColor: '#000000' }}>
        {/* GTM noscript fallback — place immediately after <body> open */}
        {/*
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        */}

        <Toaster position="top-right" />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}