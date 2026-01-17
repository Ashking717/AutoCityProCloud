import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://autocityqatar.com'), // Replace with your actual domain
  
  title: {
    default: 'Auto City Qatar - Premium Car Accessories & Automotive Services in Doha',
    template: '%s | Auto City Qatar'
  },
  
  description: 'Leading car accessories provider in Qatar. Offering vehicle facelifts, stereo upgrades, genuine & aftermarket parts, interior/exterior enhancements, window tinting & type conversion services across 3 Doha branches.',
  
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
        url: '/og-image.jpg', // Create this image (1200x630px)
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
    google: 'your-google-verification-code', // Add your Google Search Console verification
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

// JSON-LD Structured Data
export const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'AutoPartsStore',
      '@id': 'https://autocityqatar.com/#organization',
      name: 'Auto City Qatar',
      alternateName: 'اوتو سيتي قطر',
      url: 'https://autocityqatar.com',
      logo: 'https://autocityqatar.com/logo.png',
      description: 'Premium car accessories, genuine parts, and professional automotive services in Qatar',
      
      contactPoint: [
        {
          '@type': 'ContactPoint',
          telephone: '+974-5086-7676',
          contactType: 'customer service',
          areaServed: 'QA',
          availableLanguage: ['English', 'Arabic']
        },
        {
          '@type': 'ContactPoint',
          telephone: '+974-6664-2884',
          contactType: 'customer service',
          areaServed: 'QA',
          availableLanguage: ['English', 'Arabic']
        },
        {
          '@type': 'ContactPoint',
          telephone: '+974-7730-3968',
          contactType: 'customer service',
          areaServed: 'QA',
          availableLanguage: ['English', 'Arabic']
        }
      ],
      
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Doha',
        addressCountry: 'QA'
      },
      
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
          opens: '08:00',
          closes: '20:00'
        },
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: 'Friday',
          opens: '14:00',
          closes: '20:00'
        }
      ],
      
      sameAs: [
        // Add your social media profiles here
        // 'https://www.facebook.com/autocityqatar',
        // 'https://www.instagram.com/autocityqatar',
        // 'https://twitter.com/autocityqatar',
      ],
      
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Auto City Services',
        itemListElement: [
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'Vehicle Facelift',
              description: 'Transform your vehicle with comprehensive facelift services'
            }
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'Stereo Upgradation',
              description: 'Premium sound systems and multimedia units installation'
            }
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Product',
              name: 'Genuine Car Parts',
              description: 'OEM certified parts directly from manufacturers'
            }
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Product',
              name: 'Aftermarket Parts',
              description: 'High-quality aftermarket alternatives'
            }
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'Interior Upgradation',
              description: 'Premium upholstery, custom trims, and ambient lighting'
            }
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'Exterior Detailing',
              description: 'Paint correction, ceramic coating, and protective films'
            }
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'Window Tinting',
              description: 'Premium window films for UV protection and privacy'
            }
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'Vehicle Type Conversion',
              description: 'Specialized conversion services'
            }
          }
        ]
      }
    },
    
    // Branch locations
    {
      '@type': 'AutoPartsStore',
      '@id': 'https://autocityqatar.com/#branch-algharafa',
      name: 'Auto City Qatar - Al Gharafa',
      parentOrganization: {
        '@id': 'https://autocityqatar.com/#organization'
      },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Al Gharafa',
        addressRegion: 'Doha',
        addressCountry: 'QA'
      }
    },
    {
      '@type': 'AutoPartsStore',
      '@id': 'https://autocityqatar.com/#branch-muaither',
      name: 'Auto City Qatar - Muaither',
      parentOrganization: {
        '@id': 'https://autocityqatar.com/#organization'
      },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Muaither',
        addressRegion: 'Doha',
        addressCountry: 'QA'
      }
    },
    {
      '@type': 'AutoPartsStore',
      '@id': 'https://autocityqatar.com/#branch-almesila',
      name: 'Auto City Qatar - Al Mesila',
      parentOrganization: {
        '@id': 'https://autocityqatar.com/#organization'
      },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Al Mesila',
        addressRegion: 'Doha',
        addressCountry: 'QA'
      }
    },
    
    // Website
    {
      '@type': 'WebSite',
      '@id': 'https://autocityqatar.com/#website',
      url: 'https://autocityqatar.com',
      name: 'Auto City Qatar',
      description: 'Premium car accessories and automotive services in Qatar',
      publisher: {
        '@id': 'https://autocityqatar.com/#organization'
      },
      inLanguage: ['en-QA', 'ar-QA'],
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://autocityqatar.com/search?q={search_term_string}',
        'query-input': 'required name=search_term_string'
      }
    },
    
    // Breadcrumb
    {
      '@type': 'BreadcrumbList',
      '@id': 'https://autocityqatar.com/#breadcrumb',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://autocityqatar.com'
        }
      ]
    }
  ]
};