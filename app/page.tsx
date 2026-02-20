'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Wrench, Shield, ArrowRight, Phone, Mail, MapPin, ChevronDown, Clock, Disc3, Sparkles, PaintBucket, Sun, Repeat, Sofa, Settings, Globe, Moon, Play, Pause, X } from 'lucide-react';

// Types
type MediaType = 'video' | 'image';

interface ShowcaseItem {
  title: string;
  description: string;
  media: string;
  type: MediaType;
}

interface Content {
  nav: {
    services: string;
    about: string;
    showcase: string;
    branches: string;
    contact: string;
    Login: string;
  };
  hero: {
    badge: string;
    title1: string;
    title2: string;
    subtitle: string;
    description: string;
    intro: string;
    cta1: string;
    cta2: string;
    stats: Array<{ value: string; label: string }>;
  };
  showcase: {
    label: string;
    title: string;
    description: string;
    items: ShowcaseItem[];
  };
  services: {
    label: string;
    title: string;
    description: string;
    items: Array<{ title: string; description: string }>;
  };
  about: {
    label: string;
    title: string;
    description1: string;
    description2: string;
    features: string[];
  };
  branches: {
    label: string;
    title: string;
    description: string;
    items: Array<{ name: string; area: string; desc: string }>;
  };
  contact: {
    label: string;
    title: string;
    description: string;
    callUs: string;
    callUsDesc: string;
    emailUs: string;
    businessHours: string;
    satThu: string;
    friday: string;
  };
  footer: {
    description: string;
    services: string;
    contact: string;
    ourBranches: string;
    rights: string;
  };
  faq: {
    title: string;
    items: Array<{ q: string; a: string }>;
  };
}

// Content translations with SEO-optimized text
const content: Record<'en' | 'ar', Content> = {
  en: {
    nav: {
      services: 'Services',
      about: 'About',
      showcase: 'Showcase',
      branches: 'Branches',
      contact: 'Contact',
      Login: 'Login',
    },
    hero: {
      badge: 'Premium Car Accessories in Qatar',
      title1: 'Car Accessories',
      title2: 'in Qatar',
      subtitle: 'Auto City - Your Trusted Auto Accessory Shop in Doha',
      description: 'Leading car accessories shop in Qatar offering premium auto parts, stereo systems, window tinting, interior upgrades, and genuine parts. Visit our 3 Doha locations for quality automotive accessories.',
      intro: 'Looking for car accessories in Qatar? Auto City is your premier destination for automotive accessories in Doha. With three convenient locations across Doha - Al Gharafa, Muaither, and Al Mesila - we offer the widest selection of car parts and accessories in Qatar.',
      cta1: 'Browse Services',
      cta2: 'Contact Us',
      stats: [
        { value: '3', label: 'Doha Branches' },
        { value: '8+', label: 'Services' },
        { value: '10,000+', label: 'Products' },
      ],
    },
    showcase: {
      label: 'Our Work',
      title: 'Transform Your Vehicle',
      description: 'See how we bring automotive dreams to life with precision installations, authentic upgrades, and cutting-edge technology',
      items: [
        {
          title: 'Modernize Your Drive',
          description: 'Complete vehicle transformations with latest technology and premium accessories',
          media: '/assets/Modernize_Your_Drive_Today_version_1.mp4',
          type: 'video' as MediaType
        },
        {
          title: 'Authentic OEM Upgrades',
          description: 'Genuine manufacturer parts installed with precision and expertise',
          media: '/assets/Authentic_OEM_Upgrades_version_1.mp4',
          type: 'video' as MediaType
        },
        {
          title: 'Next-Gen LC 300 Transformation',
          description: 'Premium vehicle customization and facelift services',
          media: '/assets/Next-Gen_LC_300_Transformation_version_4.png',
          type: 'image' as MediaType
        },
        {
          title: 'Precision Tech Installation',
          description: 'Expert installation of advanced automotive technology systems',
          media: '/assets/Precision_Tech_Installation_version_1.mp4',
          type: 'video' as MediaType
        },
        {
          title: 'Set the Perfect Mood',
          description: 'Ambient lighting and interior enhancements for ultimate comfort',
          media: '/assets/Set_the_Perfect_Mood_version_2 (1).png',
          type: 'image' as MediaType
        },
      ]
    },
    services: {
      label: 'Car Accessories & Services',
      title: 'Complete Auto Accessories in Qatar',
      description: 'From interior upgrades to exterior enhancements, we offer comprehensive car accessories and automotive services across Doha',
      items: [
        {
          title: 'Vehicle Facelift',
          description: 'Transform your car with comprehensive facelift services in Qatar. Modernize your vehicle\'s appearance with updated styling elements and premium auto accessories.',
        },
        {
          title: 'Car Stereo Systems',
          description: 'Upgrade your car audio in Doha with premium sound systems, speakers, and multimedia units. Expert installation of Pioneer, JBL, Sony, and Kenwood stereos.',
        },
        {
          title: 'Genuine Car Parts',
          description: 'OEM certified genuine car parts in Qatar sourced directly from manufacturers. Quality guaranteed auto parts for perfect fit and performance.',
        },
        {
          title: 'Aftermarket Parts',
          description: 'High-quality aftermarket car parts in Qatar offering excellent value. Premium alternatives without compromising on performance or reliability.',
        },
        {
          title: 'Interior Accessories',
          description: 'Transform your car interior in Qatar with premium upholstery, custom trims, ambient LED lighting, seat covers, and comfort accessories.',
        },
        {
          title: 'Exterior Accessories',
          description: 'Professional car detailing in Doha including paint correction, ceramic coating, protective films, and body kit installations.',
        },
        {
          title: 'Window Tinting ',
          description: 'Premium window tinting services for UV protection, privacy, and heat reduction. Essential for Qatar\'s climate. Multiple shades available.',
        },
        {
          title: 'Vehicle Conversion',
          description: 'Specialized vehicle type conversion services in Qatar. Transform your vehicle\'s configuration to meet specific needs and requirements.',
        },
      ],
    },
    about: {
      label: 'About Auto City Qatar',
      title: 'Qatar\'s Leading Car Accessories Shop',
      description1: 'Auto City Qatar is the leading destination for car accessories and automotive services in Doha. We serve vehicle owners across Qatar with a strong focus on quality, reliability, and customer satisfaction.',
      description2: 'With three strategically located branches across Doha (Al Gharafa, Muaither, and Al Mesila) and an experienced team, we ensure premium automotive solutions are always within reach. Whether you need genuine parts, aftermarket accessories, or professional installation services, Auto City Qatar is your trusted partner.',
      features: [
        'Vehicle Facelift Services',
        'Car Audio Systems',
        'Genuine OEM Parts',
        'Aftermarket Accessories',
        'Interior Upgrades',
        'Exterior Detailing',
        'Window Tinting',
        'Vehicle Conversions',
      ],
    },
    branches: {
      label: 'Our Locations in Doha',
      title: 'Visit Our Car Accessories Shops',
      description: 'Three convenient car accessories shops across Doha, Qatar. Visit any location for premium auto parts and services.',
      items: [
        { name: 'Al Gharafa Branch', area: 'Doha, Qatar', desc: 'Car accessories shop in Al Gharafa' },
        { name: 'Muaither Branch', area: 'Doha, Qatar', desc: 'Auto parts store in Muaither' },
        { name: 'Al Mesila Branch', area: 'Doha, Qatar', desc: 'Automotive accessories in Al Mesila' },
      ],
    },
    contact: {
      label: 'Contact Auto City Qatar',
      title: 'Get in Touch - Car Accessories Qatar',
      description: 'Contact us for car accessories in Qatar. We\'re here to help with all your automotive needs across Doha.',
      callUs: 'Call Our Doha Branches',
      callUsDesc: 'Available during business hours',
      emailUs: 'Email Us',
      businessHours: 'Business Hours',
      satThu: 'Saturday – Thursday',
      friday: 'Friday',
    },
    footer: {
      description: 'Auto City Qatar - Leading car accessories shop in Doha. Premium auto parts, genuine OEM parts, aftermarket accessories, stereo systems, window tinting, and professional automotive services. Your complete car accessories solution in Qatar.',
      services: 'Car Accessories',
      contact: 'Contact',
      ourBranches: 'Doha Branches',
      rights: 'All rights reserved.',
    },
    faq: {
      title: 'Frequently Asked Questions',
      items: [
        {
          q: 'Where can I buy car accessories in Qatar?',
          a: 'Auto City Qatar offers premium car accessories across 3 locations in Doha: Al Gharafa, Muaither, and Al Mesila. We provide genuine parts, aftermarket accessories, stereo systems, window tinting, and more.'
        },
        {
          q: 'What car accessories do you offer in Doha?',
          a: 'We offer complete car accessories including interior upgrades (upholstery, trims, lighting), exterior accessories (body kits, protective films), stereo systems, genuine OEM parts, aftermarket parts, window tinting, and vehicle customization services.'
        },
        {
          q: 'Do you have genuine car parts in Qatar?',
          a: 'Yes, Auto City Qatar stocks OEM certified genuine car parts sourced directly from manufacturers, plus high-quality aftermarket alternatives for all vehicle makes and models.'
        },
      ]
    }
  },
  ar: {
    nav: {
      services: 'خدماتنا',
      about: 'من نحن',
      showcase: 'معرض الأعمال',
      branches: 'فروعنا',
      contact: 'اتصل بنا',
      Login: 'بوابة الموظفين',
    },
    hero: {
      badge: 'إكسسوارات سيارات فاخرة في قطر',
      title1: 'إكسسوارات',
      title2: 'السيارات في قطر',
      subtitle: 'اوتو سيتي - متجر قطع غيار السيارات الموثوق في الدوحة',
      description: 'متجر رائد لإكسسوارات السيارات في قطر يقدم قطع غيار متميزة وأنظمة صوت وتظليل نوافذ وترقيات داخلية وقطع أصلية. قم بزيارة فروعنا الثلاثة في الدوحة للحصول على إكسسوارات سيارات عالية الجودة.',
      intro: 'تبحث عن إكسسوارات السيارات في قطر؟ اوتو سيتي هي وجهتك المثالية لإكسسوارات السيارات في الدوحة. مع ثلاثة مواقع مريحة في الدوحة - الغرافة ومعيذر والمسيلة - نقدم أوسع مجموعة من قطع غيار وإكسسوارات السيارات في قطر.',
      cta1: 'تصفح الخدمات',
      cta2: 'اتصل بنا',
      stats: [
        { value: '٣', label: 'فروع في الدوحة' },
        { value: '+٨', label: 'خدمات' },
        { value: '+١٠٬٠٠٠', label: 'منتج' },
      ],
    },
    showcase: {
      label: 'أعمالنا',
      title: 'حوّل سيارتك',
      description: 'شاهد كيف نحقق أحلام السيارات بتركيبات دقيقة وترقيات أصلية وتقنية متطورة',
      items: [
        {
          title: 'حدّث قيادتك',
          description: 'تحويلات كاملة للمركبات بأحدث التقنيات والإكسسوارات المتميزة',
          media: '/assets/Modernize_Your_Drive_Today_version_1.mp4',
          type: 'video' as MediaType
        },
        {
          title: 'ترقيات OEM أصلية',
          description: 'قطع غيار أصلية من الشركة المصنعة مع تركيب دقيق ومهني',
          media: '/assets/Authentic_OEM_Upgrades_version_1.mp4',
          type: 'video' as MediaType
        },
        {
          title: 'تحويل LC 300 من الجيل القادم',
          description: 'خدمات تخصيص وتجديد المركبات الفاخرة',
          media: '/assets/Next-Gen_LC_300_Transformation_version_4.png',
          type: 'image' as MediaType
        },
        {
          title: 'تركيب تقني دقيق',
          description: 'تركيب احترافي لأنظمة التكنولوجيا المتقدمة للسيارات',
          media: '/assets/Precision_Tech_Installation_version_1.mp4',
          type: 'video' as MediaType
        },
        {
          title: 'اضبط المزاج المثالي',
          description: 'إضاءة محيطة وتحسينات داخلية لأقصى درجات الراحة',
          media: '/assets/Set_the_Perfect_Mood_version_2 (1).png',
          type: 'image' as MediaType
        },
      ]
    },
    services: {
      label: 'إكسسوارات وخدمات السيارات',
      title: 'إكسسوارات سيارات كاملة في قطر',
      description: 'من الترقيات الداخلية إلى التحسينات الخارجية، نقدم إكسسوارات وخدمات سيارات شاملة في الدوحة',
      items: [
        {
          title: 'تجديد المركبات',
          description: 'قم بتحويل سيارتك مع خدمات التجديد الشاملة في قطر. حدّث مظهر سيارتك بعناصر تصميم عصرية وإكسسوارات سيارات متميزة.',
        },
        {
          title: 'أنظمة صوت السيارات',
          description: 'قم بترقية صوت سيارتك في الدوحة مع أنظمة صوت متميزة ومكبرات صوت ووحدات وسائط متعددة. تركيب احترافي لأنظمة بايونير وJBL وسوني وكينوود.',
        },
        {
          title: 'قطع غيار أصلية',
          description: 'قطع غيار سيارات أصلية معتمدة من OEM في قطر مباشرة من المصنعين. جودة مضمونة لقطع غيار السيارات للملاءمة والأداء المثالي.',
        },
        {
          title: 'قطع غيار بديلة',
          description: 'قطع غيار سيارات بديلة عالية الجودة في قطر توفر قيمة ممتازة. بدائل متميزة دون المساس بالأداء أو الموثوقية.',
        },
        {
          title: 'إكسسوارات داخلية',
          description: 'قم بتحويل داخلية سيارتك في قطر مع تنجيد فاخر وزخارف مخصصة وإضاءة LED محيطة وأغطية مقاعد وإكسسوارات راحة.',
        },
        {
          title: 'إكسسوارات خارجية',
          description: 'تفصيل سيارات احترافي في الدوحة بما في ذلك تصحيح الطلاء والطلاء السيراميكي والأفلام الواقية وتركيب هياكل الجسم.',
        },
        {
          title: 'تظليل النوافذ قطر',
          description: 'خدمات تظليل نوافذ متميزة في قطر للحماية من الأشعة فوق البنفسجية والخصوصية وتقليل الحرارة. ضروري لمناخ قطر. درجات متعددة متاحة.',
        },
        {
          title: 'تحويل المركبات',
          description: 'خدمات تحويل نوع المركبة المتخصصة في قطر. قم بتحويل تكوين سيارتك لتلبية الاحتياجات والمتطلبات الخاصة.',
        },
      ],
    },
    about: {
      label: 'عن اوتو سيتي قطر',
      title: 'متجر إكسسوارات السيارات الرائد في قطر',
      description1: 'اوتو سيتي قطر هي الوجهة الرائدة لإكسسوارات السيارات وخدمات السيارات في الدوحة. نخدم أصحاب المركبات في جميع أنحاء قطر مع التركيز القوي على الجودة والموثوقية ورضا العملاء.',
      description2: 'مع ثلاثة فروع في مواقع استراتيجية في الدوحة (الغرافة ومعيذر والمسيلة) وفريق من ذوي الخبرة، نضمن أن حلول السيارات المتميزة دائماً في متناول اليد. سواء كنت بحاجة إلى قطع غيار أصلية أو إكسسوارات بديلة أو خدمات تركيب احترافية، اوتو سيتي قطر هو شريكك الموثوق.',
      features: [
        'خدمات تجديد المركبات',
        'أنظمة صوت السيارات',
        'قطع غيار OEM أصلية',
        'إكسسوارات بديلة',
        'ترقيات داخلية',
        'تفصيل خارجي',
        'تظليل النوافذ',
        'تحويلات المركبات',
      ],
    },
    branches: {
      label: 'مواقعنا في الدوحة',
      title: 'قم بزيارة متاجر إكسسوارات السيارات لدينا',
      description: 'ثلاثة متاجر إكسسوارات سيارات مريحة في الدوحة، قطر. قم بزيارة أي موقع للحصول على قطع غيار وخدمات سيارات متميزة.',
      items: [
        { name: 'فرع الغرافة', area: 'الدوحة، قطر', desc: 'متجر إكسسوارات السيارات في الغرافة' },
        { name: 'فرع معيذر', area: 'الدوحة، قطر', desc: 'متجر قطع غيار السيارات في معيذر' },
        { name: 'فرع المسيلة', area: 'الدوحة، قطر', desc: 'إكسسوارات السيارات في المسيلة' },
      ],
    },
    contact: {
      label: 'اتصل بـ اوتو سيتي قطر',
      title: 'تواصل معنا - إكسسوارات السيارات قطر',
      description: 'اتصل بنا للحصول على إكسسوارات السيارات في قطر. نحن هنا لمساعدتك في جميع احتياجات سيارتك في الدوحة.',
      callUs: 'اتصل بفروعنا في الدوحة',
      callUsDesc: 'متاح خلال ساعات العمل',
      emailUs: 'راسلنا',
      businessHours: 'ساعات العمل',
      satThu: 'السبت – الخميس',
      friday: 'الجمعة',
    },
    footer: {
      description: 'اوتو سيتي قطر - متجر إكسسوارات السيارات الرائد في الدوحة. قطع غيار سيارات متميزة، قطع غيار OEM أصلية، إكسسوارات بديلة، أنظمة صوت، تظليل نوافذ، وخدمات سيارات احترافية. حل إكسسوارات السيارات الكامل في قطر.',
      services: 'إكسسوارات السيارات',
      contact: 'اتصل بنا',
      ourBranches: 'فروع الدوحة',
      rights: 'جميع الحقوق محفوظة.',
    },
    faq: {
      title: 'الأسئلة الشائعة',
      items: [
        {
          q: 'أين يمكنني شراء إكسسوارات السيارات في قطر؟',
          a: 'تقدم اوتو سيتي قطر إكسسوارات سيارات متميزة في 3 مواقع في الدوحة: الغرافة ومعيذر والمسيلة. نوفر قطع غيار أصلية وإكسسوارات بديلة وأنظمة صوت وتظليل نوافذ والمزيد.'
        },
        {
          q: 'ما هي إكسسوارات السيارات التي تقدمونها في الدوحة؟',
          a: 'نقدم إكسسوارات سيارات كاملة بما في ذلك الترقيات الداخلية (التنجيد والزخارف والإضاءة) والإكسسوارات الخارجية (هياكل الجسم والأفلام الواقية) وأنظمة الصوت وقطع غيار OEM الأصلية والقطع البديلة وتظليل النوافذ وخدمات تخصيص المركبات.'
        },
        {
          q: 'هل لديكم قطع غيار سيارات أصلية في قطر؟',
          a: 'نعم، تخزن اوتو سيتي قطر قطع غيار سيارات أصلية معتمدة من OEM مباشرة من المصنعين، بالإضافة إلى بدائل عالية الجودة لجميع ماركات وموديلات المركبات.'
        },
      ]
    }
  },
};

const serviceIcons = [Sparkles, Disc3, Shield, Settings, Sofa, PaintBucket, Sun, Repeat];

const phoneNumbers = [
  '+974 5086 7676',
  '+974 6664 2884',
  '+974 7730 3968',
];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap');

  :root {
    --scrollbar-track: #f1f5f9;
    --noise-opacity: 0.008;
    --glass-bg: rgba(255, 255, 255, 0.8);
    --glass-border: rgba(0, 0, 0, 0.05);
    --glass-dark-bg: rgba(255, 255, 255, 0.95);
    --glass-dark-border: rgba(0, 0, 0, 0.05);
  }

  .theme-dark {
    --scrollbar-track: #0A0A0A;
    --noise-opacity: 0.015;
    --glass-bg: rgba(255, 255, 255, 0.03);
    --glass-border: rgba(255, 255, 255, 0.05);
    --glass-dark-bg: rgba(0, 0, 0, 0.6);
    --glass-dark-border: rgba(255, 255, 255, 0.05);
  }

  .theme-light {
    --scrollbar-track: #f1f5f9;
    --noise-opacity: 0.008;
    --glass-bg: rgba(255, 255, 255, 0.8);
    --glass-border: rgba(0, 0, 0, 0.05);
    --glass-dark-bg: rgba(255, 255, 255, 0.95);
    --glass-dark-border: rgba(0, 0, 0, 0.05);
  }

  .ltr {
    direction: ltr;
    font-family: 'Outfit', sans-serif;
  }

  .rtl {
    direction: rtl;
    font-family: 'Tajawal', sans-serif;
  }

  html {
    scroll-behavior: smooth;
  }

  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
  }
  ::-webkit-scrollbar-thumb {
    background: #E84545;
    border-radius: 4px;
  }

  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(60px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 0.5; }
    100% { transform: scale(1.4); opacity: 0; }
  }

  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }

  .animate-fade-in-up {
    animation: fadeInUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
  }

  .animate-fade-in {
    animation: fadeIn 1s ease forwards;
    opacity: 0;
  }

  .animate-scale-in {
    animation: scaleIn 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
  }

  .delay-100 { animation-delay: 0.1s; }
  .delay-200 { animation-delay: 0.2s; }
  .delay-300 { animation-delay: 0.3s; }
  .delay-400 { animation-delay: 0.4s; }
  .delay-500 { animation-delay: 0.5s; }
  .delay-600 { animation-delay: 0.6s; }

  .hover-lift {
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .hover-lift:hover {
    transform: translateY(-8px);
  }

  .hover-glow:hover {
    box-shadow: 0 0 40px rgba(232, 69, 69, 0.3);
  }

  .glass {
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    border: 1px solid var(--glass-border);
  }

  .glass-dark {
    background: var(--glass-dark-bg);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--glass-dark-border);
  }

  .noise::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1000;
    opacity: var(--noise-opacity);
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  }

  .line-accent {
    position: relative;
  }
  .line-accent::after {
    content: '';
    position: absolute;
    bottom: -12px;
    left: 0;
    width: 60px;
    height: 3px;
    background: #E84545;
  }

  .rtl .line-accent::after {
    left: auto;
    right: 0;
  }

  .line-accent-center::after {
    left: 50%;
    transform: translateX(-50%);
  }

  .rtl .line-accent-center::after {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
  }

  .media-overlay {
    position: relative;
    overflow: hidden;
    border-radius: 1rem;
    cursor: pointer;
  }

  .media-overlay::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 60%);
    opacity: 0;
    transition: opacity 0.4s ease;
  }

  .media-overlay:hover::after {
    opacity: 1;
  }

  .play-button {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 64px;
    height: 64px;
    background: rgba(232, 69, 69, 0.9);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
  }

  .media-overlay:hover .play-button {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.1);
  }

  .shimmer-effect {
    background: linear-gradient(90deg, transparent, rgba(232, 69, 69, 0.1), transparent);
    background-size: 200% 100%;
    animation: shimmer 3s infinite;
  }
`;

export default function HomePage() {
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ src: string; type: MediaType; title: string } | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const t = content[lang];
  const isRTL = lang === 'ar';

  useEffect(() => {
    setMounted(true);
    const checkTime = () => {
      const hour = new Date().getHours();
      setIsDark(hour < 6 || hour >= 18);
    };
    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div suppressHydrationWarning className={`min-h-screen ${isDark ? 'theme-dark bg-[#050505] text-white' : 'theme-light bg-gray-50 text-gray-900'} overflow-x-hidden ${isRTL ? 'rtl' : 'ltr'} transition-colors duration-500`}>
      {/* Styles extracted to a JS string to avoid SSR/client quote-escaping mismatch */}
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: styles }} />

      <div className="noise" />

      {/* Media Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95" onClick={() => setSelectedMedia(null)}>
          <button
            onClick={() => setSelectedMedia(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="relative max-w-6xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <h3 className="text-2xl font-bold text-white">{selectedMedia.title}</h3>
            </div>
            {selectedMedia.type === 'video' ? (
              <video src={selectedMedia.src} controls autoPlay className="w-full h-auto rounded-xl" />
            ) : (
              <Image src={selectedMedia.src} alt={selectedMedia.title} width={1200} height={675} className="w-full h-auto rounded-xl" />
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50" role="banner">
        <div className="glass-dark">
          <nav className="max-w-7xl mx-auto px-6 lg:px-8" aria-label="Main navigation">
            <div className="flex items-center justify-between h-20">
              <Link href="/" className="relative h-12 w-48" aria-label="Auto City Qatar - Car Accessories Shop in Doha">
                <Image
                  src="/login.png"
                  alt="Auto City Qatar - Premium Car Accessories in Doha"
                  fill
                  sizes="192px"
                  className="object-contain object-left"
                  priority
                />
              </Link>

              <ul className="hidden lg:flex items-center gap-10">
                {[
                  { key: 'services', href: '#services' },
                  { key: 'showcase', href: '#showcase' },
                  { key: 'about', href: '#about' },
                  { key: 'branches', href: '#branches' },
                  { key: 'contact', href: '#contact' },
                ].map((item) => (
                  <li key={item.key}>
                    <a
                      href={item.href}
                      className={`text-sm font-medium ${isDark ? 'text-gray-400 hover:text-[#E84545]' : 'text-gray-600 hover:text-[#E84545]'} transition-colors duration-300 relative group`}
                    >
                      {t.nav[item.key as keyof typeof t.nav]}
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#E84545] group-hover:w-full transition-all duration-300" />
                    </a>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300/10">
                  {isDark ? (
                    <Moon className="w-4 h-4 text-[#E84545]" aria-hidden="true" />
                  ) : (
                    <Sun className="w-4 h-4 text-[#E84545]" aria-hidden="true" />
                  )}
                </div>

                <button
                  onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-white/10 hover:border-[#E84545]/50' : 'border-gray-200 hover:border-[#E84545]/50'} transition-colors`}
                  aria-label={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'}
                >
                  <Globe className="w-4 h-4 text-[#E84545]" aria-hidden="true" />
                  <span className="text-sm font-medium">{lang === 'en' ? 'العربية' : 'English'}</span>
                </button>

                <Link
                  href="/autocityPro/login"
                  className="hidden md:block px-6 py-2.5 bg-[#E84545] text-white text-sm font-semibold rounded-lg hover:bg-[#cc3c3c] transition-all duration-300 hover-glow"
                >
                  {t.nav.Login}
                </Link>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20" aria-labelledby="hero-heading">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className={`absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full ${isDark ? 'opacity-10' : 'opacity-5'} bg-[#E84545] blur-[150px]`} />
          <div
            className={`absolute inset-0 ${isDark ? 'opacity-[0.02]' : 'opacity-[0.01]'}`}
            style={{
              backgroundImage: `linear-gradient(to right, #E84545 1px, transparent 1px), linear-gradient(to bottom, #E84545 1px, transparent 1px)`,
              backgroundSize: '80px 80px'
            }}
          />
          <div
            className={`absolute top-0 right-0 w-1/2 h-full ${isDark ? 'opacity-[0.03]' : 'opacity-[0.015]'}`}
            style={{
              backgroundImage: `repeating-linear-gradient(-45deg, #E84545, #E84545 1px, transparent 1px, transparent 60px)`
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className={`animate-fade-in-up inline-flex items-center gap-3 px-4 py-2 rounded-full border border-[#E84545]/30 ${isDark ? 'bg-[#E84545]/5' : 'bg-[#E84545]/10'} mb-8`}>
                <span className="w-2 h-2 rounded-full bg-[#E84545] animate-pulse" aria-hidden="true" />
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t.hero.badge}</span>
              </div>

              <h1 id="hero-heading" className="animate-fade-in-up delay-100">
                <span className={`block text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                  {t.hero.title1}
                </span>
                <span className="block text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#E84545]">
                  {t.hero.title2}
                </span>
              </h1>

              <p className={`animate-fade-in-up delay-200 text-xl ${isDark ? 'text-gray-500' : 'text-gray-600'} mt-6 mb-8`}>
                {t.hero.subtitle}
              </p>

              <p className={`animate-fade-in-up delay-300 text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'} max-w-lg mb-6 leading-relaxed`}>
                {t.hero.description}
              </p>

              <p className={`animate-fade-in-up delay-300 text-base ${isDark ? 'text-gray-500' : 'text-gray-500'} max-w-lg mb-10 leading-relaxed`}>
                {t.hero.intro}
              </p>

              <div className="animate-fade-in-up delay-400 flex flex-wrap gap-4">
                <a
                  href="#services"
                  className="group inline-flex items-center gap-2 px-8 py-4 bg-[#E84545] text-white font-semibold rounded-lg hover:bg-[#cc3c3c] transition-all duration-300 hover-glow"
                >
                  {t.hero.cta1}
                  <ArrowRight className={`w-5 h-5 group-hover:translate-x-1 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} aria-hidden="true" />
                </a>
                <a
                  href="#contact"
                  className={`inline-flex items-center gap-2 px-8 py-4 border ${isDark ? 'border-white/20 text-white hover:border-[#E84545]' : 'border-gray-300 text-gray-900 hover:border-[#E84545]'} font-semibold rounded-lg hover:text-[#E84545] transition-all duration-300`}
                >
                  {t.hero.cta2}
                </a>
              </div>

              <div className={`animate-fade-in-up delay-500 flex gap-12 mt-16 pt-10 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                {t.hero.stats.map((stat) => (
                  <div key={stat.label}>
                    <div className="text-3xl font-bold text-[#E84545]">{stat.value}</div>
                    <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'} mt-1`}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="animate-scale-in delay-300 relative hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                  <div className={`w-[400px] h-[400px] border ${isDark ? 'border-[#E84545]/10' : 'border-[#E84545]/20'} rounded-full`} />
                  <div className={`absolute w-[500px] h-[500px] border ${isDark ? 'border-[#E84545]/5' : 'border-[#E84545]/10'} rounded-full`} />
                  <div
                    className={`absolute w-[300px] h-[300px] border-2 ${isDark ? 'border-[#E84545]/20' : 'border-[#E84545]/30'} rounded-full`}
                    style={{ animation: 'pulse-ring 3s ease-out infinite' }}
                  />
                </div>
                <div className="relative w-[400px] h-[400px] mx-auto flex items-center justify-center">
                  <div className="glass rounded-3xl p-12 hover-lift">
                    <Image
                      src="/logo.png"
                      alt="Auto City Qatar - Leading Car Accessories Provider in Doha"
                      width={300}
                      height={150}
                      className="object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-fade-in delay-600">
          <a href="#services" className={`flex flex-col items-center gap-2 ${isDark ? 'text-gray-500' : 'text-gray-400'} hover:text-[#E84545] transition-colors`} aria-label="Scroll to car accessories services">
            <ChevronDown className="w-5 h-5 animate-bounce" aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="relative py-32" aria-labelledby="services-heading">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <header className="text-center mb-20">
            <span className="text-[#E84545] text-sm font-semibold tracking-[0.2em] uppercase">{t.services.label}</span>
            <h2 id="services-heading" className="text-4xl md:text-5xl font-bold mt-4 mb-6 relative inline-block line-accent line-accent-center">
              {t.services.title}
            </h2>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-lg max-w-2xl mx-auto mt-8`}>
              {t.services.description}
            </p>
          </header>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.services.items.map((service, i) => {
              const Icon = serviceIcons[i];
              return (
                <article
                  key={service.title}
                  className={`group relative p-6 lg:p-8 ${isDark ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-gray-200'} border rounded-2xl hover:border-[#E84545]/30 hover-lift transition-all duration-500`}
                  itemScope
                  itemType="https://schema.org/Service"
                >
                  <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-[#E84545]/10' : 'bg-[#E84545]/5'} flex items-center justify-center mb-5 group-hover:bg-[#E84545] transition-colors duration-300`}>
                    <Icon className="w-6 h-6 text-[#E84545] group-hover:text-white transition-colors duration-300" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-bold mb-3" itemProp="name">{service.title}</h3>
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm leading-relaxed`} itemProp="description">{service.description}</p>
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-[#E84545] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-b-2xl" aria-hidden="true" />
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section id="showcase" className={`relative py-32 ${isDark ? 'bg-[#0A0A0A]' : 'bg-white'}`} aria-labelledby="showcase-heading">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <header className="text-center mb-20">
            <span className="text-[#E84545] text-sm font-semibold tracking-[0.2em] uppercase">{t.showcase.label}</span>
            <h2 id="showcase-heading" className="text-4xl md:text-5xl font-bold mt-4 mb-6 relative inline-block line-accent line-accent-center">
              {t.showcase.title}
            </h2>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-lg max-w-2xl mx-auto mt-8`}>
              {t.showcase.description}
            </p>
          </header>

          <div className="mb-16">
            <div
              className="relative group overflow-hidden rounded-3xl cursor-pointer"
              onClick={() => setSelectedMedia({ src: t.showcase.items[0].media, type: t.showcase.items[0].type, title: t.showcase.items[0].title })}
            >
              {t.showcase.items[0].type === 'video' ? (
                <video
                  ref={(el) => { videoRefs.current['featured'] = el; }}
                  src={t.showcase.items[0].media}
                  className="w-full h-[500px] object-cover"
                  loop
                  muted
                  playsInline
                />
              ) : (
                <Image
                  src={t.showcase.items[0].media}
                  alt={t.showcase.items[0].title}
                  width={1200}
                  height={500}
                  className="w-full h-[500px] object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-8 lg:p-12">
                <div className="w-full">
                  <h3 className="text-3xl lg:text-4xl font-bold text-white mb-3">{t.showcase.items[0].title}</h3>
                  <p className="text-gray-300 text-lg max-w-2xl">{t.showcase.items[0].description}</p>
                </div>
              </div>
              {t.showcase.items[0].type === 'video' && (
                <div className="play-button">
                  <Play className="w-6 h-6 text-white ml-1" />
                </div>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.showcase.items.slice(1).map((item, idx) => (
              <div
                key={item.title}
                className="media-overlay group"
                onClick={() => setSelectedMedia({ src: item.media, type: item.type, title: item.title })}
              >
                {item.type === 'video' ? (
                  <video
                    ref={(el) => { videoRefs.current[`showcase-${idx}`] = el; }}
                    src={item.media}
                    className="w-full h-64 object-cover rounded-2xl"
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <Image
                    src={item.media}
                    alt={item.title}
                    width={400}
                    height={300}
                    className="w-full h-64 object-cover rounded-2xl"
                  />
                )}
                <div className="absolute inset-0 flex flex-col justify-end p-6 z-10">
                  <h4 className="text-white font-bold text-lg mb-1">{item.title}</h4>
                  <p className="text-gray-300 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {item.description}
                  </p>
                </div>
                {item.type === 'video' && (
                  <div className="play-button">
                    <Play className="w-5 h-5 text-white ml-1" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative py-32" aria-labelledby="about-heading">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#E84545] text-sm font-semibold tracking-[0.2em] uppercase">{t.about.label}</span>
              <h2 id="about-heading" className="text-4xl md:text-5xl font-bold mt-4 mb-8 relative line-accent">
                {t.about.title}
              </h2>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-lg mb-6 leading-relaxed`}>
                {t.about.description1}
              </p>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-lg mb-10 leading-relaxed`}>
                {t.about.description2}
              </p>
              <ul className="grid grid-cols-2 gap-4">
                {t.about.features.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#E84545]" aria-hidden="true" />
                    <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'} text-sm`}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="glass rounded-3xl p-10 lg:p-16">
                <div className="text-center">
                  <Image
                    src="/login.png"
                    alt="Auto City Qatar - Premium Car Accessories Shop in Doha"
                    width={350}
                    height={175}
                    className="mx-auto mb-8"
                  />
                  <div className="space-y-2">
                    <p className="text-xl font-semibold">{lang === 'en' ? 'Auto City Qatar' : 'اوتو سيتي قطر'}</p>
                    <p className={`text-lg ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>{lang === 'en' ? 'Car Accessories & Auto Parts' : 'إكسسوارات السيارات وقطع الغيار'}</p>
                  </div>
                </div>
              </div>
              <div className={`absolute -top-4 ${isRTL ? '-left-4' : '-right-4'} w-24 h-24 border-t-2 ${isRTL ? 'border-l-2 rounded-tl-3xl' : 'border-r-2 rounded-tr-3xl'} border-[#E84545]/30`} aria-hidden="true" />
              <div className={`absolute -bottom-4 ${isRTL ? '-right-4' : '-left-4'} w-24 h-24 border-b-2 ${isRTL ? 'border-r-2 rounded-br-3xl' : 'border-l-2 rounded-bl-3xl'} border-[#E84545]/30`} aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      {lang === 'en' && (
        <section className={`relative py-32 ${isDark ? 'bg-[#0A0A0A]' : 'bg-white'}`} aria-labelledby="faq-heading">
          <div className="max-w-4xl mx-auto px-6 lg:px-8">
            <header className="text-center mb-16">
              <h2 id="faq-heading" className="text-4xl md:text-5xl font-bold relative inline-block line-accent line-accent-center">
                {t.faq.title}
              </h2>
            </header>
            <div className="space-y-6">
              {t.faq.items.map((item) => (
                <div key={item.q} className="glass rounded-2xl p-8" itemScope itemType="https://schema.org/Question">
                  <h3 className="text-xl font-bold mb-4 text-[#E84545]" itemProp="name">{item.q}</h3>
                  <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} leading-relaxed`} itemProp="text">{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Branches Section */}
      <section id="branches" className="relative py-32" aria-labelledby="branches-heading">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <header className="text-center mb-16">
            <span className="text-[#E84545] text-sm font-semibold tracking-[0.2em] uppercase">{t.branches.label}</span>
            <h2 id="branches-heading" className="text-4xl md:text-5xl font-bold mt-4 mb-6 relative inline-block line-accent line-accent-center">
              {t.branches.title}
            </h2>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-lg max-w-2xl mx-auto mt-8`}>
              {t.branches.description}
            </p>
          </header>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {t.branches.items.map((branch) => (
              <article
                key={branch.name}
                className={`group p-8 ${isDark ? 'bg-[#050505] border-white/5' : 'bg-gray-50 border-gray-200'} border rounded-2xl text-center hover:border-[#E84545]/30 hover-lift transition-all duration-300`}
                itemScope
                itemType="https://schema.org/LocalBusiness"
              >
                <div className={`w-16 h-16 rounded-full ${isDark ? 'bg-[#E84545]/10' : 'bg-[#E84545]/5'} flex items-center justify-center mx-auto mb-6 group-hover:bg-[#E84545] transition-colors duration-300`}>
                  <MapPin className="w-7 h-7 text-[#E84545] group-hover:text-white transition-colors duration-300" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold mb-2" itemProp="name">{branch.name}</h3>
                <p className={`${isDark ? 'text-gray-500' : 'text-gray-600'} mb-2`} itemProp="address">{branch.area}</p>
                <p className={`text-sm ${isDark ? 'text-gray-600' : 'text-gray-500'}`}>{branch.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className={`relative py-32 ${isDark ? 'bg-[#0A0A0A]' : 'bg-white'}`} aria-labelledby="contact-heading">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <header className="text-center mb-16">
            <span className="text-[#E84545] text-sm font-semibold tracking-[0.2em] uppercase">{t.contact.label}</span>
            <h2 id="contact-heading" className="text-4xl md:text-5xl font-bold mt-4 mb-6 relative inline-block line-accent line-accent-center">
              {t.contact.title}
            </h2>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-lg mt-8`}>
              {t.contact.description}
            </p>
          </header>

          <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div className="glass rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-[#E84545]/10' : 'bg-[#E84545]/5'} flex items-center justify-center`}>
                  <Phone className="w-6 h-6 text-[#E84545]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{t.contact.callUs}</h3>
                  <p className={`${isDark ? 'text-gray-500' : 'text-gray-600'} text-sm`}>{t.contact.callUsDesc}</p>
                </div>
              </div>
              <address className="space-y-4 not-italic">
                {phoneNumbers.map((phone) => (
                  <a
                    key={phone}
                    href={`tel:${phone.replace(/\s/g, '')}`}
                    className={`flex items-center justify-between p-4 ${isDark ? 'bg-white/5 hover:bg-[#E84545]/10' : 'bg-gray-100 hover:bg-[#E84545]/5'} rounded-xl transition-colors group`}
                    dir="ltr"
                    itemProp="telephone"
                  >
                    <span className="text-lg font-medium">{phone}</span>
                    <ArrowRight className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'} group-hover:text-[#E84545] group-hover:translate-x-1 transition-all`} aria-hidden="true" />
                  </a>
                ))}
              </address>
            </div>

            <div className="space-y-6">
              <div className="glass rounded-2xl p-8">
                <address className="flex items-center gap-3 not-italic">
                  <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-[#E84545]/10' : 'bg-[#E84545]/5'} flex items-center justify-center`}>
                    <Mail className="w-6 h-6 text-[#E84545]" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{t.contact.emailUs}</h3>
                    <a href="mailto:info@autocityqatar.com" className={`${isDark ? 'text-gray-400' : 'text-gray-600'} hover:text-[#E84545] transition-colors`} itemProp="email">
                      info@autocityqatar.com
                    </a>
                  </div>
                </address>
              </div>

              <div className="glass rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-[#E84545]/10' : 'bg-[#E84545]/5'} flex items-center justify-center`}>
                    <Clock className="w-6 h-6 text-[#E84545]" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-bold">{t.contact.businessHours}</h3>
                </div>
                <dl className="space-y-3">
                  <div className={`flex justify-between items-center py-2 border-b ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                    <dt className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t.contact.satThu}</dt>
                    <dd className="font-medium" dir="ltr">
                      <time dateTime="08:00">8:00 AM</time> – <time dateTime="20:00">8:00 PM</time>
                    </dd>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <dt className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t.contact.friday}</dt>
                    <dd className="font-medium" dir="ltr">
                      <time dateTime="14:00">2:00 PM</time> – <time dateTime="20:00">8:00 PM</time>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`relative py-16 border-t ${isDark ? 'border-white/5' : 'border-gray-200'}`} role="contentinfo">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <Image
                src="/login.png"
                alt="Auto City Qatar - Car Accessories Shop"
                width={180}
                height={90}
                className="mb-6"
              />
              <p className={`${isDark ? 'text-gray-500' : 'text-gray-600'} max-w-sm leading-relaxed mb-6 text-sm`}>
                {t.footer.description}
              </p>
              <p className="text-[#E84545] font-semibold">
                {lang === 'en' ? 'اوتو سيتي لزينة السيارات' : 'Auto City Car Accessories'}
              </p>
            </div>

            <nav aria-label="Footer car accessories services">
              <h4 className="font-semibold mb-6">{t.footer.services}</h4>
              <ul className={`space-y-3 ${isDark ? 'text-gray-500' : 'text-gray-600'} text-sm`}>
                {t.services.items.slice(0, 5).map((service) => (
                  <li key={service.title}>{service.title}</li>
                ))}
              </ul>
            </nav>

            <address className="not-italic">
              <h4 className="font-semibold mb-6">{t.footer.contact}</h4>
              <ul className={`space-y-3 ${isDark ? 'text-gray-500' : 'text-gray-600'} text-sm`}>
                {phoneNumbers.map((phone) => (
                  <li key={phone} dir="ltr">
                    <a href={`tel:${phone.replace(/\s/g, '')}`} className="hover:text-[#E84545] transition-colors">
                      {phone}
                    </a>
                  </li>
                ))}
                <li className="pt-2">
                  <a href="mailto:info@autocityqatar.com" className="hover:text-[#E84545] transition-colors">
                    info@autocityqatar.com
                  </a>
                </li>
              </ul>
            </address>
          </div>

          <div className={`py-8 border-t border-b ${isDark ? 'border-white/5' : 'border-gray-200'} mb-8`}>
            <div className={`flex flex-wrap items-center justify-center gap-8 ${isDark ? 'text-gray-500' : 'text-gray-600'} text-sm`}>
              <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.footer.ourBranches}:</span>
              {t.branches.items.map((branch) => (
                <span key={branch.name} className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#E84545]" aria-hidden="true" />
                  {branch.name}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className={`${isDark ? 'text-gray-500' : 'text-gray-600'} text-sm`}>
              © {new Date().getFullYear()} {lang === 'en' ? 'Auto City Qatar - Car Accessories Shop in Doha' : 'اوتو سيتي قطر - متجر إكسسوارات السيارات في الدوحة'}. {t.footer.rights}
            </p>
            <Link
              href="/autocityPro/login"
              className={`${isDark ? 'text-gray-500' : 'text-gray-600'} hover:text-[#E84545] transition-colors text-sm`}
            >
              {t.nav.Login}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}