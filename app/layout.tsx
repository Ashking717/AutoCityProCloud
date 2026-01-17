import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { jsonLd } from './metadata';

const inter = Inter({ subsets: ["latin"] });

// Comprehensive SEO Metadata
export const metadata: Metadata = {
  metadataBase: new URL('https://autocityqatar.com'),
  
  title: {
    default: "Auto City Qatar - Premium Car Accessories & Automotive Services in Doha",
    template: "%s | Auto City Qatar",
  },
  
  description: "Leading car accessories provider in Qatar. Offering vehicle facelifts, stereo upgrades, genuine & aftermarket parts, interior/exterior enhancements, window tinting & type conversion services across 3 Doha branches.",
  
  keywords: [
    'car accessories Qatar',
    'auto accessories Doha',
    'car parts Qatar',
    'vehicle facelift Qatar',
    'car stereo upgrade Doha',
    'window tinting Qatar',
    'car interior upgrade',
    'genuine car parts Qatar',
    'aftermarket car parts',
    'auto city Qatar',
    'car detailing Doha',
    'vehicle customization Qatar',
    'car audio system Qatar',
    'automotive services Doha',
    'car modification Qatar'
  ],
  
  authors: [{ name: 'Auto City Qatar' }],
  creator: 'Auto City Qatar',
  publisher: 'Auto City Qatar',
  
  formatDetection: {
    email: true,
    address: true,
    telephone: true,
  },
  
  manifest: "/manifest.json",
  
  appleWebApp: {
    capable: true,
    title: "Auto City Qatar",
    statusBarStyle: "black-translucent",
  },
  
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/icons/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
  
  openGraph: {
    type: 'website',
    locale: 'en_QA',
    alternateLocale: ['ar_QA'],
    url: 'https://autocityqatar.com',
    siteName: 'Auto City Qatar',
    title: 'Auto City Qatar - Premium Car Accessories & Automotive Services',
    description: 'Your trusted destination for vehicle facelifts, stereo upgrades, genuine parts, interior & exterior enhancements, and professional tinting services across Qatar.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Auto City Qatar - Car Accessories',
      }
    ],
  },
  
  twitter: {
    card: 'summary_large_image',
    title: 'Auto City Qatar - Premium Car Accessories & Automotive Services',
    description: 'Leading car accessories provider in Qatar with 3 branches in Doha. Quality parts, professional services.',
    images: ['/og-image.jpg'],
  },
  
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
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
    },
  },
  
  verification: {
    google: 'your-google-verification-code', // Replace with actual verification code
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
  
  category: 'Automotive',
  
  other: {
    'contact:phone_number': '+974 5086 7676',
    'contact:email': 'info@autocityqatar.com',
    'business:contact_data:locality': 'Doha',
    'business:contact_data:country_name': 'Qatar',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* JSON-LD Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        
        {/* Performance Optimization */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Theme Color - Matches brand color */}
        <meta name="theme-color" content="#E84545" />
        <meta name="msapplication-TileColor" content="#E84545" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={inter.className}>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}