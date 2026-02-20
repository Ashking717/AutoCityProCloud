import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://autocityqatar.com'),

  title: {
    default: 'Car Accessories Qatar | Auto Parts Doha | Auto City Qatar – 3 Branches',
    template: '%s | Auto City Qatar – Car Accessories Doha'
  },

  description: 'Auto City Qatar: #1 car accessories shop in Doha. Genuine OEM parts, aftermarket accessories, window tinting, stereo upgrades, vehicle facelifts & interior upgrades. 3 branches: Al Gharafa, Muaither, Al Mesila. Call +974 5086 7676.',

  keywords: [
    // Core product keywords
    'car accessories Qatar',
    'car accessories Doha',
    'auto accessories Qatar',
    'auto parts Qatar',
    'car parts Qatar',
    'car parts Doha',
    'auto parts Doha',
    'vehicle accessories Qatar',

    // Service-specific
    'window tinting Qatar',
    'window tinting Doha',
    'car window tint Qatar',
    'car stereo upgrade Qatar',
    'car audio Doha',
    'car stereo Doha',
    'Pioneer stereo Qatar',
    'JBL car audio Qatar',
    'vehicle facelift Qatar',
    'car facelift Doha',
    'car interior upgrade Qatar',
    'car interior accessories Doha',
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
    'spare parts Doha',

    // Location-specific
    'car accessories Al Gharafa',
    'car accessories Muaither',
    'car accessories Al Mesila',
    'auto shop Doha',
    'auto shop Qatar',
    'car accessories shop Qatar',
    'auto city Qatar',

    // Arabic transliterations
    'ekseswarat sayarat qatar',
    'qita ghiyar qatar',
    'tazhil nawafez qatar',

    // Long-tail
    'best car accessories shop Qatar',
    'where to buy car parts in Qatar',
    'car audio system installation Doha',
    'car interior modification Qatar',
    'car wrapping Qatar',
    'LED car lights Qatar',
    'dash cam installation Qatar',
    'car seat covers Qatar',
    'alloy wheels Qatar',
    'car spoiler Qatar',
  ],

  authors: [{ name: 'Auto City Qatar', url: 'https://autocityqatar.com' }],
  creator: 'Auto City Qatar',
  publisher: 'Auto City Qatar',

  formatDetection: {
    email: true,
    address: true,
    telephone: true,
  },

  openGraph: {
    type: 'website',
    locale: 'en_QA',
    alternateLocale: ['ar_QA'],
    url: 'https://autocityqatar.com',
    siteName: 'Auto City Qatar',
    title: 'Car Accessories Qatar | Auto City – Doha\'s #1 Auto Parts Store',
    description: 'Shop premium car accessories, genuine OEM parts, stereo upgrades, window tinting, vehicle facelifts & interior upgrades at Auto City Qatar. 3 convenient Doha branches. Call us today!',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Auto City Qatar – Car Accessories Shop in Doha | 3 Branches',
        type: 'image/jpeg',
      }
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
    google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },

  category: 'Automotive',
  classification: 'Car Accessories, Auto Parts, Automotive Services',

  other: {
    'contact:phone_number': '+974 5086 7676',
    'contact:email': 'info@autocityqatar.com',
    'business:contact_data:locality': 'Doha',
    'business:contact_data:country_name': 'Qatar',
    'business:contact_data:region': 'Ad Dawhah',
    'geo.region': 'QA-DA',
    'geo.placename': 'Doha, Qatar',
    'geo.position': '25.2854;51.5310',
    'ICBM': '25.2854, 51.5310',
    'og:locality': 'Doha',
    'og:region': 'Ad Dawhah',
    'og:country-name': 'Qatar',
    'og:phone_number': '+974 5086 7676',
    'og:email': 'info@autocityqatar.com',
    'rating': 'general',
    'revisit-after': '3 days',
    'language': 'English, Arabic',
    'coverage': 'Qatar, Doha, Al Gharafa, Muaither, Al Mesila',
    'distribution': 'local',
    'target': 'all',
  },
};

// ─── COMPREHENSIVE JSON-LD STRUCTURED DATA ───────────────────────────────────

export const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [

    // ── 1. ORGANIZATION ────────────────────────────────────────────────────────
    {
      '@type': 'Organization',
      '@id': 'https://autocityqatar.com/#organization',
      name: 'Auto City Qatar',
      alternateName: ['اوتو سيتي قطر', 'Auto City Doha', 'Auto City'],
      legalName: 'Auto City Qatar Car Accessories',
      description: 'Leading car accessories provider in Qatar offering vehicle facelifts, car stereo upgrades, genuine OEM parts, aftermarket parts, interior & exterior enhancements, window tinting, and professional automotive services across 3 Doha branches',
      url: 'https://autocityqatar.com',
      logo: {
        '@type': 'ImageObject',
        '@id': 'https://autocityqatar.com/#logo',
        url: 'https://autocityqatar.com/login.png',
        contentUrl: 'https://autocityqatar.com/login.png',
        caption: 'Auto City Qatar – Car Accessories Logo',
        inLanguage: 'en-QA',
        width: 600,
        height: 60,
      },
      image: {
        '@type': 'ImageObject',
        url: 'https://autocityqatar.com/og-image.jpg',
        width: 1200,
        height: 630,
      },
      telephone: ['+974-5086-7676', '+974-6664-2884', '+974-7730-3968'],
      email: 'info@autocityqatar.com',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Doha',
        addressRegion: 'Ad Dawhah',
        addressCountry: 'QA',
      },
      areaServed: {
        '@type': 'Country',
        name: 'Qatar',
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
      contactPoint: [
        {
          '@type': 'ContactPoint',
          telephone: '+974-5086-7676',
          contactType: 'customer service',
          areaServed: 'QA',
          availableLanguage: ['English', 'Arabic'],
          contactOption: 'TollFree',
        },
        {
          '@type': 'ContactPoint',
          telephone: '+974-6664-2884',
          contactType: 'customer service',
          areaServed: 'QA',
          availableLanguage: ['English', 'Arabic'],
        },
        {
          '@type': 'ContactPoint',
          telephone: '+974-7730-3968',
          contactType: 'customer service',
          areaServed: 'QA',
          availableLanguage: ['English', 'Arabic'],
        },
      ],
      sameAs: [
        // Add when live:
        // 'https://www.facebook.com/autocityqatar',
        // 'https://www.instagram.com/autocityqatar',
        // 'https://twitter.com/autocityqatar',
        // 'https://www.youtube.com/autocityqatar',
        // 'https://www.tiktok.com/@autocityqatar',
      ],
      numberOfEmployees: { '@type': 'QuantitativeValue', minValue: 10 },
      foundingLocation: { '@type': 'Place', name: 'Doha, Qatar' },
    },

    // ── 2. PRIMARY AUTO PARTS STORE ────────────────────────────────────────────
    {
      '@type': 'AutoPartsStore',
      '@id': 'https://autocityqatar.com/#store',
      name: 'Auto City Qatar',
      alternateName: 'اوتو سيتي قطر',
      url: 'https://autocityqatar.com',
      logo: 'https://autocityqatar.com/login.png',
      image: 'https://autocityqatar.com/og-image.jpg',
      description: 'Qatar\'s leading car accessories and auto parts store in Doha with 3 branches. Genuine OEM parts, aftermarket accessories, stereo upgrades, window tinting, vehicle facelifts and more.',
      priceRange: '$$',
      currenciesAccepted: 'QAR',
      paymentAccepted: 'Cash, Credit Card',
      telephone: '+974-5086-7676',
      email: 'info@autocityqatar.com',
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
      hasMap: 'https://maps.google.com/?q=Auto+City+Qatar+Doha',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        reviewCount: '200',
        bestRating: '5',
        worstRating: '1',
      },
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Car Accessories & Automotive Services Qatar',
        itemListElement: [
          {
            '@type': 'Offer',
            name: 'Vehicle Facelift Qatar',
            url: 'https://autocityqatar.com/#services',
            itemOffered: {
              '@type': 'Service',
              name: 'Vehicle Facelift',
              description: 'Complete vehicle facelift and modernization services in Qatar. Update your car\'s appearance with the latest styling elements and premium accessories.',
              provider: { '@id': 'https://autocityqatar.com/#organization' },
              areaServed: { '@type': 'Country', name: 'Qatar' },
              serviceType: 'Vehicle Facelift',
            },
          },
          {
            '@type': 'Offer',
            name: 'Car Stereo Upgrade Doha',
            itemOffered: {
              '@type': 'Service',
              name: 'Car Stereo & Audio System Upgrade',
              description: 'Professional car stereo, speakers, and multimedia installation in Doha. Pioneer, JBL, Sony, Kenwood, Alpine systems available.',
              provider: { '@id': 'https://autocityqatar.com/#organization' },
              areaServed: { '@type': 'Country', name: 'Qatar' },
            },
          },
          {
            '@type': 'Offer',
            name: 'Genuine OEM Car Parts Qatar',
            itemOffered: {
              '@type': 'Product',
              name: 'Genuine Car Parts & OEM Parts',
              description: 'Certified OEM genuine car parts sourced directly from manufacturers for all vehicle makes and models in Qatar.',
              brand: { '@type': 'Brand', name: 'OEM Genuine Parts' },
            },
          },
          {
            '@type': 'Offer',
            name: 'Aftermarket Car Parts Qatar',
            itemOffered: {
              '@type': 'Product',
              name: 'Aftermarket Car Parts',
              description: 'High-quality aftermarket car parts and accessories in Qatar at competitive prices.',
            },
          },
          {
            '@type': 'Offer',
            name: 'Car Interior Upgrade Qatar',
            itemOffered: {
              '@type': 'Service',
              name: 'Interior Accessories & Upgrades',
              description: 'Premium car interior upgrades in Qatar: custom upholstery, ambient LED lighting, seat covers, carbon trim, and comfort accessories.',
            },
          },
          {
            '@type': 'Offer',
            name: 'Car Exterior Accessories Doha',
            itemOffered: {
              '@type': 'Service',
              name: 'Exterior Detailing & Accessories',
              description: 'Professional exterior car accessories and detailing in Doha: paint correction, ceramic coating, PPF, body kits, spoilers.',
            },
          },
          {
            '@type': 'Offer',
            name: 'Window Tinting Qatar',
            itemOffered: {
              '@type': 'Service',
              name: 'Window Tinting Qatar',
              description: 'Premium window tinting services in Qatar. UV protection, heat rejection, and privacy tint films. Essential for Qatar\'s hot climate.',
              provider: { '@id': 'https://autocityqatar.com/#organization' },
              areaServed: { '@type': 'Country', name: 'Qatar' },
            },
          },
          {
            '@type': 'Offer',
            name: 'Vehicle Type Conversion Qatar',
            itemOffered: {
              '@type': 'Service',
              name: 'Vehicle Type Conversion',
              description: 'Specialized vehicle type conversion services in Qatar. Transform your vehicle\'s configuration for specific use cases.',
            },
          },
        ],
      },
    },

    // ── 3. BRANCH: AL GHARAFA ──────────────────────────────────────────────────
    {
      '@type': 'AutoPartsStore',
      '@id': 'https://autocityqatar.com/#branch-algharafa',
      name: 'Auto City Qatar – Al Gharafa Branch',
      alternateName: 'اوتو سيتي قطر - الغرافة',
      url: 'https://autocityqatar.com',
      description: 'Auto City car accessories shop in Al Gharafa, Doha, Qatar. Genuine parts, stereo systems, window tinting and more.',
      telephone: '+974-5086-7676',
      parentOrganization: { '@id': 'https://autocityqatar.com/#organization' },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Al Gharafa',
        addressRegion: 'Doha',
        addressCountry: 'QA',
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
    },

    // ── 4. BRANCH: MUAITHER ────────────────────────────────────────────────────
    {
      '@type': 'AutoPartsStore',
      '@id': 'https://autocityqatar.com/#branch-muaither',
      name: 'Auto City Qatar – Muaither Branch',
      alternateName: 'اوتو سيتي قطر - معيذر',
      url: 'https://autocityqatar.com',
      description: 'Auto City auto parts store in Muaither, Doha, Qatar. Car accessories, window tinting, stereo upgrade and more.',
      telephone: '+974-6664-2884',
      parentOrganization: { '@id': 'https://autocityqatar.com/#organization' },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Muaither',
        addressRegion: 'Doha',
        addressCountry: 'QA',
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
    },

    // ── 5. BRANCH: AL MESILA ───────────────────────────────────────────────────
    {
      '@type': 'AutoPartsStore',
      '@id': 'https://autocityqatar.com/#branch-almesila',
      name: 'Auto City Qatar – Al Mesila Branch',
      alternateName: 'اوتو سيتي قطر - المسيلة',
      url: 'https://autocityqatar.com',
      description: 'Auto City automotive accessories shop in Al Mesila, Doha, Qatar. Car parts, window tinting, vehicle facelift services.',
      telephone: '+974-7730-3968',
      parentOrganization: { '@id': 'https://autocityqatar.com/#organization' },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Al Mesila',
        addressRegion: 'Doha',
        addressCountry: 'QA',
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
    },

    // ── 6. WEBSITE ─────────────────────────────────────────────────────────────
    {
      '@type': 'WebSite',
      '@id': 'https://autocityqatar.com/#website',
      url: 'https://autocityqatar.com',
      name: 'Auto City Qatar – Car Accessories & Auto Parts Doha',
      description: 'Qatar\'s leading car accessories and auto parts website. Shop genuine OEM parts, aftermarket accessories, stereo upgrades, window tinting services, vehicle facelifts and more.',
      publisher: { '@id': 'https://autocityqatar.com/#organization' },
      inLanguage: ['en-QA', 'ar-QA'],
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://autocityqatar.com/search?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },

    // ── 7. FAQ PAGE ────────────────────────────────────────────────────────────
    {
      '@type': 'FAQPage',
      '@id': 'https://autocityqatar.com/#faq',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Where can I buy car accessories in Qatar?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Auto City Qatar has 3 car accessories shops in Doha: Al Gharafa, Muaither, and Al Mesila. We stock genuine OEM parts, aftermarket accessories, car stereos, window tinting films, interior and exterior accessories. Call +974 5086 7676 or visit any branch.',
          },
        },
        {
          '@type': 'Question',
          name: 'What car accessories do you offer in Doha?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Auto City Qatar offers: vehicle facelifts, car stereo & audio system upgrades (Pioneer, JBL, Sony, Kenwood), genuine OEM car parts, aftermarket parts, interior upgrades (upholstery, LED lighting, seat covers), exterior accessories (ceramic coating, PPF, body kits), window tinting, and vehicle type conversions.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do you stock genuine OEM car parts in Qatar?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Auto City Qatar stocks certified genuine OEM car parts sourced directly from manufacturers for all major vehicle brands, alongside high-quality aftermarket alternatives. Available at all 3 Doha branches.',
          },
        },
        {
          '@type': 'Question',
          name: 'What are the best window tinting services in Qatar?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Auto City Qatar provides premium window tinting in Doha with UV protection, heat rejection, and privacy films. Multiple tint shades available. Essential for Qatar\'s climate. Visit any of our 3 branches in Al Gharafa, Muaither, or Al Mesila.',
          },
        },
        {
          '@type': 'Question',
          name: 'What are Auto City Qatar\'s opening hours?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Auto City Qatar branches are open Saturday to Thursday 8:00 AM – 8:00 PM, and Friday 2:00 PM – 8:00 PM. Contact us on +974 5086 7676.',
          },
        },
        {
          '@type': 'Question',
          name: 'Where is Auto City Qatar located?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Auto City Qatar has 3 branches in Doha, Qatar: Al Gharafa Branch, Muaither Branch, and Al Mesila Branch. Call +974 5086 7676 to get directions to your nearest branch.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do you offer car stereo installation in Doha?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Auto City Qatar offers professional car stereo and audio system installation in Doha. We carry Pioneer, JBL, Sony, Kenwood, and Alpine systems, plus subwoofers, amplifiers, and multimedia head units.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can you do a vehicle facelift in Qatar?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Absolutely. Auto City Qatar specialises in complete vehicle facelifts in Qatar, updating exterior styling, lighting, grilles, bumpers, and interior trim to give your car a modern, refreshed look.',
          },
        },
      ],
    },

    // ── 8. BREADCRUMB ──────────────────────────────────────────────────────────
    {
      '@type': 'BreadcrumbList',
      '@id': 'https://autocityqatar.com/#breadcrumb',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://autocityqatar.com',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Car Accessories Qatar',
          item: 'https://autocityqatar.com/#services',
        },
      ],
    },

    // ── 9. LOCAL BUSINESS (GEO-ENRICHED) ──────────────────────────────────────
    {
      '@type': ['LocalBusiness', 'AutoPartsStore'],
      '@id': 'https://autocityqatar.com/#localbusiness',
      name: 'Auto City Qatar',
      image: 'https://autocityqatar.com/og-image.jpg',
      '@context': 'https://schema.org',
      url: 'https://autocityqatar.com',
      telephone: '+974-5086-7676',
      email: 'info@autocityqatar.com',
      priceRange: '$$',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Doha',
        addressRegion: 'Ad Dawhah',
        postalCode: '',
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
      },
      hasMap: 'https://maps.google.com/?q=Auto+City+Qatar+Doha',
      currenciesAccepted: 'QAR',
      paymentAccepted: 'Cash, Credit Card',
      areaServed: [
        { '@type': 'City', name: 'Doha' },
        { '@type': 'City', name: 'Al Gharafa' },
        { '@type': 'City', name: 'Muaither' },
        { '@type': 'City', name: 'Al Mesila' },
        { '@type': 'Country', name: 'Qatar' },
      ],
      sameAs: [],
    },
  ],
};

// ─── INJECT INTO LAYOUT ───────────────────────────────────────────────────────
// Usage in app/layout.tsx:
//
// import { metadata, jsonLd } from './metadata';
// export { metadata };
//
// In the <head> section:
// <script
//   type="application/ld+json"
//   dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
// />