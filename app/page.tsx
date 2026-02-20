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
    regularHours: string;
    ramadanHours: string;
    daysSatThu: string;
    daysFriday: string;
    regularSatThuTime: string;
    regularFridayTime: string;
    ramadanSatThuTime: string;
    ramadanFridayTime: string;
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

// Content translations
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
        { value: '10K+', label: 'Products' },
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
      title: 'Get in Touch',
      description: 'Contact us for car accessories in Qatar. We\'re here to help with all your automotive needs across Doha.',
      callUs: 'Call Our Doha Branches',
      callUsDesc: 'Available during business hours',
      emailUs: 'Email Us',
      businessHours: 'Business Hours',
      regularHours: 'Standard Timings',
      ramadanHours: 'Ramadan Timings',
      daysSatThu: 'Saturday – Thursday',
      daysFriday: 'Friday',
      regularSatThuTime: '8:00 AM – 12:30 PM, 3:30 PM – 11:00 PM',
      regularFridayTime: '3:00 PM – 9:00 PM',
      ramadanSatThuTime: '9:00 AM – 12:00 PM, 2:00 PM – 5:00 PM, 7:00 PM – 1:00 AM',
      ramadanFridayTime: '2:30 PM – 5:30 PM, 7:00 PM – 1:00 AM',
    },
    footer: {
      description: 'Auto City Qatar - Leading car accessories shop in Doha. Premium auto parts, genuine OEM parts, aftermarket accessories, stereo systems, window tinting, and professional automotive services.',
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
        { value: '+١٠K', label: 'منتج' },
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
      title: 'قم بزيارة فروعنا',
      description: 'ثلاثة متاجر إكسسوارات سيارات مريحة في الدوحة، قطر. قم بزيارة أي موقع للحصول على قطع غيار وخدمات سيارات متميزة.',
      items: [
        { name: 'فرع الغرافة', area: 'الدوحة، قطر', desc: 'متجر إكسسوارات السيارات في الغرافة' },
        { name: 'فرع معيذر', area: 'الدوحة، قطر', desc: 'متجر قطع غيار السيارات في معيذر' },
        { name: 'فرع المسيلة', area: 'الدوحة، قطر', desc: 'إكسسوارات السيارات في المسيلة' },
      ],
    },
    contact: {
      label: 'اتصل بـ اوتو سيتي قطر',
      title: 'تواصل معنا',
      description: 'اتصل بنا للحصول على إكسسوارات السيارات في قطر. نحن هنا لمساعدتك في جميع احتياجات سيارتك في الدوحة.',
      callUs: 'اتصل بفروعنا في الدوحة',
      callUsDesc: 'متاح خلال ساعات العمل',
      emailUs: 'راسلنا',
      businessHours: 'ساعات العمل',
      regularHours: 'الأوقات العادية',
      ramadanHours: 'أوقات شهر رمضان',
      daysSatThu: 'السبت – الخميس',
      daysFriday: 'الجمعة',
      regularSatThuTime: '8:00 صباحاً – 12:30 مساءً ، 3:30 مساءً – 11:00 مساءً',
      regularFridayTime: '3:00 مساءً – 9:00 مساءً',
      ramadanSatThuTime: '9:00 صباحاً – 12:00 مساءً ، 2:00 مساءً – 5:00 مساءً ، 7:00 مساءً – 1:00 صباحاً',
      ramadanFridayTime: '2:30 مساءً – 5:30 مساءً ، 7:00 مساءً – 1:00 صباحاً',
    },
    footer: {
      description: 'اوتو سيتي قطر - متجر إكسسوارات السيارات الرائد في الدوحة. قطع غيار سيارات متميزة، قطع غيار OEM أصلية، إكسسوارات بديلة، أنظمة صوت، تظليل نوافذ، وخدمات سيارات احترافية.',
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
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

  :root {
    --scrollbar-track: #f1f5f9;
    --noise-opacity: 0.015;
    --glass-bg: rgba(255, 255, 255, 0.6);
    --glass-border: rgba(255, 255, 255, 0.4);
    --glass-dark-bg: rgba(15, 15, 15, 0.4);
    --glass-dark-border: rgba(255, 255, 255, 0.08);
    --brand-red: #E84545;
  }

  .theme-dark {
    --scrollbar-track: #0A0A0A;
    --glass-bg: var(--glass-dark-bg);
    --glass-border: var(--glass-dark-border);
  }

  .theme-light {
    --scrollbar-track: #f1f5f9;
    --glass-bg: rgba(255, 255, 255, 0.8);
    --glass-border: rgba(0, 0, 0, 0.05);
  }

  .ltr {
    direction: ltr;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  .rtl {
    direction: rtl;
    font-family: 'Cairo', sans-serif;
  }

  html {
    scroll-behavior: smooth;
  }

  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
  }
  ::-webkit-scrollbar-thumb {
    background: var(--brand-red);
    border-radius: 10px;
  }

  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(40px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0px); }
  }

  .animate-fade-in-up {
    animation: fadeInUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    opacity: 0;
  }

  .animate-scale-in {
    animation: scaleIn 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    opacity: 0;
  }

  .delay-100 { animation-delay: 0.1s; }
  .delay-200 { animation-delay: 0.2s; }
  .delay-300 { animation-delay: 0.3s; }
  .delay-400 { animation-delay: 0.4s; }

  .hover-lift {
    transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .hover-lift:hover {
    transform: translateY(-6px);
    box-shadow: 0 15px 30px -10px rgba(0,0,0,0.1);
  }
  .theme-dark .hover-lift:hover {
    box-shadow: 0 15px 30px -10px rgba(232, 69, 69, 0.15);
  }

  .glass {
    background: var(--glass-bg);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--glass-border);
  }

  .btn-primary {
    background: linear-gradient(135deg, #E84545 0%, #D83434 100%);
    box-shadow: 0 4px 15px rgba(232, 69, 69, 0.3);
    transition: all 0.3s ease;
  }
  .btn-primary:hover {
    box-shadow: 0 8px 25px rgba(232, 69, 69, 0.5);
    transform: translateY(-2px);
  }

  .line-accent {
    position: relative;
    padding-bottom: 0.5rem;
  }
  .line-accent::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 60px;
    height: 4px;
    background: linear-gradient(90deg, #E84545, transparent);
    border-radius: 4px;
  }
  .rtl .line-accent::after {
    left: auto;
    right: 0;
    background: linear-gradient(-90deg, #E84545, transparent);
  }
  .line-accent-center::after {
    left: 50%;
    transform: translateX(-50%);
    background: #E84545;
  }
  .rtl .line-accent-center::after {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
  }

  .media-overlay {
    position: relative;
    overflow: hidden;
    border-radius: 1.25rem;
    cursor: pointer;
  }
  .media-overlay::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0,0,0,0.2) 50%, transparent 100%);
    opacity: 0.8;
    transition: opacity 0.4s ease;
  }
  .media-overlay:hover::after {
    opacity: 1;
  }
  .play-button {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.9);
    width: 70px;
    height: 70px;
    background: rgba(232, 69, 69, 0.95);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
    box-shadow: 0 0 20px rgba(232, 69, 69, 0.5);
    z-index: 20;
  }
  .media-overlay:hover .play-button {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  .media-overlay img, .media-overlay video {
    transition: transform 0.6s ease;
  }
  .media-overlay:hover img, .media-overlay:hover video {
    transform: scale(1.05);
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

  if (!mounted) return null;

  return (
    <div suppressHydrationWarning className={`min-h-screen ${isDark ? 'theme-dark bg-[#0a0a0a] text-white' : 'theme-light bg-gray-50 text-gray-900'} overflow-x-hidden ${isRTL ? 'rtl' : 'ltr'} transition-colors duration-500`}>
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: styles }} />

      {/* Subtle Noise Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015] z-50 mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />

      {/* Media Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md transition-all" onClick={() => setSelectedMedia(null)}>
          <button
            onClick={() => setSelectedMedia(null)}
            className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-[#E84545] transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="relative max-w-6xl w-full max-h-[90vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <h3 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">{selectedMedia.title}</h3>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-[#E84545]/20 border border-white/10">
                {selectedMedia.type === 'video' ? (
                <video src={selectedMedia.src} controls autoPlay className="w-full h-auto" />
                ) : (
                <Image src={selectedMedia.src} alt={selectedMedia.title} width={1200} height={675} className="w-full h-auto" />
                )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 glass transition-all duration-300">
        <nav className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="relative h-12 w-48 transition-transform hover:scale-105">
              <Image
                src="/login.png"
                alt="Auto City Qatar"
                fill
                sizes="192px"
                className="object-contain object-left"
                priority
              />
            </Link>

            <ul className="hidden lg:flex items-center gap-10">
              {['services', 'showcase', 'about', 'branches', 'contact'].map((key) => (
                <li key={key}>
                  <a
                    href={`#${key}`}
                    className={`text-sm font-semibold tracking-wide ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors relative group`}
                  >
                    {t.nav[key as keyof typeof t.nav]}
                    <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-[#E84545] group-hover:w-full transition-all duration-300 ease-out" />
                  </a>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsDark(!isDark)}
                className="hidden md:flex items-center justify-center w-10 h-10 rounded-full border border-gray-500/20 hover:bg-gray-500/10 transition-colors"
              >
                {isDark ? <Moon className="w-4 h-4 text-[#E84545]" /> : <Sun className="w-4 h-4 text-[#E84545]" />}
              </button>

              <button
                onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full border ${isDark ? 'border-white/10 hover:border-[#E84545]/50 bg-white/5' : 'border-gray-200 hover:border-[#E84545]/50 bg-white'} transition-all`}
              >
                <Globe className="w-4 h-4 text-[#E84545]" />
                <span className="text-sm font-bold">{lang === 'en' ? 'العربية' : 'EN'}</span>
              </button>

              <Link
                href="/autocityPro/login"
                className="hidden md:block px-7 py-2.5 btn-primary text-white text-sm font-bold rounded-full tracking-wide"
              >
                {t.nav.Login}
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-28 pb-20 overflow-hidden">
        {/* Premium Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[#E84545]/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-[#E84545]/10 blur-[120px]" />
          <div className={`absolute inset-0 ${isDark ? 'opacity-[0.03]' : 'opacity-[0.05]'}`}
               style={{ backgroundImage: `linear-gradient(${isDark ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)'} 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-2xl">
              <div className={`animate-fade-in-up inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-[#E84545]/30 ${isDark ? 'bg-[#E84545]/10' : 'bg-[#E84545]/5'} backdrop-blur-md mb-8`}>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E84545] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E84545]"></span>
                </span>
                <span className={`text-sm font-semibold tracking-wide ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{t.hero.badge}</span>
              </div>

              <h1 className="animate-fade-in-up delay-100 mb-6">
                <span className={`block text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-2 ${isDark ? 'bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400' : 'text-gray-900'}`}>
                  {t.hero.title1}
                </span>
                <span className="block text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#E84545] to-[#ff6b6b]">
                  {t.hero.title2}
                </span>
              </h1>

              <p className={`animate-fade-in-up delay-200 text-xl md:text-2xl font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-6`}>
                {t.hero.subtitle}
              </p>

              <p className={`animate-fade-in-up delay-300 text-base md:text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-10 leading-relaxed`}>
                {t.hero.description}
              </p>

              <div className="animate-fade-in-up delay-400 flex flex-wrap gap-5">
                <a href="#services" className="group flex items-center gap-2 px-8 py-4 btn-primary text-white font-bold rounded-full">
                  {t.hero.cta1}
                  <ArrowRight className={`w-5 h-5 group-hover:translate-x-1 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                </a>
                <a href="#contact" className={`flex items-center gap-2 px-8 py-4 border-2 ${isDark ? 'border-white/20 text-white hover:border-white hover:bg-white/5' : 'border-gray-900 text-gray-900 hover:bg-gray-50'} font-bold rounded-full transition-all`}>
                  {t.hero.cta2}
                </a>
              </div>

              {/* Elevated Stats */}
              <div className="animate-fade-in-up delay-400 mt-16 grid grid-cols-3 gap-4 lg:gap-8">
                {t.hero.stats.map((stat) => (
                  <div key={stat.label} className="glass rounded-2xl p-4 text-center border-t border-white/10 shadow-lg">
                    <div className="text-3xl md:text-4xl font-extrabold text-[#E84545] mb-1">{stat.value}</div>
                    <div className={`text-xs md:text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="animate-scale-in delay-200 relative hidden lg:block" style={{ animation: 'float 6s ease-in-out infinite' }}>
              <div className="relative w-full aspect-square max-w-[500px] mx-auto flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#E84545]/20 to-transparent rounded-[40px] rotate-6 blur-md" />
                <div className="glass rounded-[40px] w-full h-full p-12 relative z-10 border border-white/20 shadow-2xl flex items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="Auto City Qatar"
                    width={400}
                    height={200}
                    className="object-contain filter drop-shadow-2xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="relative py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <header className="text-center mb-20">
            <span className="text-[#E84545] text-sm font-bold tracking-[0.2em] uppercase mb-3 block">{t.services.label}</span>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 relative inline-block line-accent line-accent-center">
              {t.services.title}
            </h2>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-lg max-w-2xl mx-auto mt-6`}>
              {t.services.description}
            </p>
          </header>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.services.items.map((service, i) => {
              const Icon = serviceIcons[i];
              return (
                <article
                  key={service.title}
                  className={`group relative p-8 glass rounded-3xl border border-transparent ${isDark ? 'hover:border-[#E84545]/40 hover:bg-white/[0.02]' : 'hover:border-[#E84545]/40 hover:bg-white'} hover-lift overflow-hidden`}
                >
                  <div className={`w-14 h-14 rounded-2xl ${isDark ? 'bg-[#E84545]/10' : 'bg-[#E84545]/5'} flex items-center justify-center mb-6 group-hover:bg-[#E84545] transition-colors duration-500`}>
                    <Icon className="w-7 h-7 text-[#E84545] group-hover:text-white transition-colors duration-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm leading-relaxed`}>{service.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section id="showcase" className={`relative py-24 lg:py-32 ${isDark ? 'bg-[#0f0f0f]' : 'bg-gray-100'} border-y ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <header className="text-center mb-16">
            <span className="text-[#E84545] text-sm font-bold tracking-[0.2em] uppercase mb-3 block">{t.showcase.label}</span>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 relative inline-block line-accent line-accent-center">
              {t.showcase.title}
            </h2>
          </header>

          <div className="mb-8">
            <div
              className="media-overlay rounded-[2rem]"
              onClick={() => setSelectedMedia({ src: t.showcase.items[0].media, type: t.showcase.items[0].type, title: t.showcase.items[0].title })}
            >
              {t.showcase.items[0].type === 'video' ? (
                <video src={t.showcase.items[0].media} className="w-full h-[600px] object-cover" autoPlay loop muted playsInline />
              ) : (
                <Image src={t.showcase.items[0].media} alt={t.showcase.items[0].title} width={1200} height={600} className="w-full h-[600px] object-cover" />
              )}
              <div className="absolute inset-0 flex flex-col justify-end p-8 lg:p-12 z-10">
                <div className="max-w-3xl">
                  <h3 className="text-3xl lg:text-5xl font-extrabold text-white mb-4 tracking-tight">{t.showcase.items[0].title}</h3>
                  <p className="text-gray-200 text-lg md:text-xl font-medium">{t.showcase.items[0].description}</p>
                </div>
              </div>
              {t.showcase.items[0].type === 'video' && (
                <div className="play-button">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.showcase.items.slice(1).map((item) => (
              <div
                key={item.title}
                className="media-overlay rounded-2xl group"
                onClick={() => setSelectedMedia({ src: item.media, type: item.type, title: item.title })}
              >
                {item.type === 'video' ? (
                  <video src={item.media} className="w-full h-72 object-cover" autoPlay loop muted playsInline />
                ) : (
                  <Image src={item.media} alt={item.title} width={400} height={300} className="w-full h-72 object-cover" />
                )}
                <div className="absolute inset-0 flex flex-col justify-end p-6 z-10">
                  <h4 className="text-white font-bold text-xl mb-1">{item.title}</h4>
                  <p className="text-gray-300 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                    {item.description}
                  </p>
                </div>
                {item.type === 'video' && (
                  <div className="play-button !w-14 !h-14">
                    <Play className="w-6 h-6 text-white ml-1" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#E84545] text-sm font-bold tracking-[0.2em] uppercase mb-3 block">{t.about.label}</span>
              <h2 className="text-4xl md:text-5xl font-extrabold mb-8 relative line-accent">
                {t.about.title}
              </h2>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} text-lg mb-6 leading-relaxed`}>
                {t.about.description1}
              </p>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-lg mb-10 leading-relaxed`}>
                {t.about.description2}
              </p>
              <ul className="grid grid-cols-2 gap-y-4 gap-x-6">
                {t.about.features.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#E84545] shadow-[0_0_8px_#E84545]" />
                    <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium`}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative p-4">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#E84545] to-transparent opacity-20 rounded-[3rem] blur-2xl" />
              <div className="glass rounded-[3rem] p-12 lg:p-20 relative z-10 border border-white/10">
                <div className="text-center">
                  <Image
                    src="/login.png"
                    alt="Auto City Qatar"
                    width={400}
                    height={200}
                    className="mx-auto mb-10 filter drop-shadow-xl"
                  />
                  <div className="space-y-3">
                    <p className="text-2xl font-extrabold tracking-wide">{lang === 'en' ? 'Auto City Qatar' : 'اوتو سيتي قطر'}</p>
                    <p className={`text-lg font-medium tracking-wider uppercase ${isDark ? 'text-[#E84545]' : 'text-[#D83434]'}`}>
                      {lang === 'en' ? 'Premium Auto Upgrades' : 'ترقيات سيارات متميزة'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Branches Section */}
      <section id="branches" className={`relative py-24 lg:py-32 ${isDark ? 'bg-[#0f0f0f]' : 'bg-gray-100'} border-y ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <header className="text-center mb-16">
            <span className="text-[#E84545] text-sm font-bold tracking-[0.2em] uppercase mb-3 block">{t.branches.label}</span>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 relative inline-block line-accent line-accent-center">
              {t.branches.title}
            </h2>
          </header>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {t.branches.items.map((branch) => (
              <article
                key={branch.name}
                className="group p-8 glass rounded-3xl text-center hover-lift border border-transparent hover:border-[#E84545]/40"
              >
                <div className={`w-16 h-16 rounded-2xl ${isDark ? 'bg-[#E84545]/10' : 'bg-[#E84545]/5'} flex items-center justify-center mx-auto mb-6 group-hover:bg-[#E84545] transition-colors duration-300`}>
                  <MapPin className="w-8 h-8 text-[#E84545] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-2xl font-bold mb-2">{branch.name}</h3>
                <p className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>{branch.area}</p>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{branch.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <header className="text-center mb-16">
            <span className="text-[#E84545] text-sm font-bold tracking-[0.2em] uppercase mb-3 block">{t.contact.label}</span>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 relative inline-block line-accent line-accent-center">
              {t.contact.title}
            </h2>
          </header>

          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="space-y-8">
              <div className="glass rounded-3xl p-8 lg:p-10 border border-white/10">
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-14 h-14 rounded-2xl ${isDark ? 'bg-[#E84545]/10' : 'bg-[#E84545]/5'} flex items-center justify-center`}>
                    <Phone className="w-7 h-7 text-[#E84545]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{t.contact.callUs}</h3>
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} font-medium`}>{t.contact.callUsDesc}</p>
                  </div>
                </div>
                <address className="space-y-4 not-italic">
                  {phoneNumbers.map((phone) => (
                    <a key={phone} href={`tel:${phone.replace(/\s/g, '')}`} className={`flex items-center justify-between p-5 ${isDark ? 'bg-white/5 hover:bg-[#E84545]/10 border border-white/5' : 'bg-gray-100 hover:bg-gray-200 border border-gray-200'} rounded-2xl transition-all group`} dir="ltr">
                      <span className="text-xl font-bold tracking-wider">{phone}</span>
                      <ArrowRight className={`w-6 h-6 text-[#E84545] group-hover:translate-x-2 transition-transform`} />
                    </a>
                  ))}
                </address>
              </div>

              <div className="glass rounded-3xl p-8 lg:p-10 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl ${isDark ? 'bg-[#E84545]/10' : 'bg-[#E84545]/5'} flex items-center justify-center shrink-0`}>
                  <Mail className="w-7 h-7 text-[#E84545]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">{t.contact.emailUs}</h3>
                  <a href="mailto:info@autocityqatar.com" className={`text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} hover:text-[#E84545] transition-colors break-all`}>
                    info@autocityqatar.com
                  </a>
                </div>
              </div>
            </div>

            {/* Timings Card */}
            <div className="glass rounded-3xl p-8 lg:p-10 border border-white/10 h-full">
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-14 h-14 rounded-2xl ${isDark ? 'bg-[#E84545]/10' : 'bg-[#E84545]/5'} flex items-center justify-center`}>
                  <Clock className="w-7 h-7 text-[#E84545]" />
                </div>
                <h3 className="text-2xl font-bold">{t.contact.businessHours}</h3>
              </div>

              <div className="space-y-8">
                {/* Regular Timings */}
                <div>
                  <h4 className="text-sm font-bold tracking-widest uppercase text-[#E84545] mb-4">{t.contact.regularHours}</h4>
                  <dl className="space-y-3">
                    <div className={`flex flex-col xl:flex-row xl:justify-between py-3 border-b ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                      <dt className={`font-semibold mb-1 xl:mb-0 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t.contact.daysSatThu}</dt>
                      <dd className="font-bold xl:text-right" dir="ltr">{t.contact.regularSatThuTime}</dd>
                    </div>
                    <div className="flex flex-col xl:flex-row xl:justify-between py-3">
                      <dt className={`font-semibold mb-1 xl:mb-0 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t.contact.daysFriday}</dt>
                      <dd className="font-bold xl:text-right" dir="ltr">{t.contact.regularFridayTime}</dd>
                    </div>
                  </dl>
                </div>

                {/* Ramadan Timings */}
                <div>
                  <h4 className="text-sm font-bold tracking-widest uppercase text-[#E84545] mb-4">{t.contact.ramadanHours}</h4>
                  <dl className="space-y-3">
                    <div className={`flex flex-col xl:flex-row xl:justify-between py-3 border-b ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                      <dt className={`font-semibold mb-1 xl:mb-0 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t.contact.daysSatThu}</dt>
                      <dd className="font-bold xl:text-right leading-relaxed" dir="ltr">{t.contact.ramadanSatThuTime}</dd>
                    </div>
                    <div className="flex flex-col xl:flex-row xl:justify-between py-3">
                      <dt className={`font-semibold mb-1 xl:mb-0 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t.contact.daysFriday}</dt>
                      <dd className="font-bold xl:text-right leading-relaxed" dir="ltr">{t.contact.ramadanFridayTime}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`relative pt-20 pb-10 border-t ${isDark ? 'border-white/10 bg-[#050505]' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <Image src="/login.png" alt="Auto City Qatar" width={200} height={100} className="mb-6" />
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} max-w-md leading-relaxed mb-6 font-medium`}>
                {t.footer.description}
              </p>
            </div>
            
            <nav>
              <h4 className="text-lg font-bold mb-6">{t.footer.services}</h4>
              <ul className={`space-y-4 ${isDark ? 'text-gray-400' : 'text-gray-600'} font-medium`}>
                {t.services.items.slice(0, 4).map((service) => (
                  <li key={service.title}><a href="#services" className="hover:text-[#E84545] transition-colors">{service.title}</a></li>
                ))}
              </ul>
            </nav>

            <address className="not-italic">
              <h4 className="text-lg font-bold mb-6">{t.footer.contact}</h4>
              <ul className={`space-y-4 ${isDark ? 'text-gray-400' : 'text-gray-600'} font-medium`}>
                {phoneNumbers.map((phone) => (
                  <li key={phone} dir="ltr"><a href={`tel:${phone.replace(/\s/g, '')}`} className="hover:text-[#E84545] transition-colors">{phone}</a></li>
                ))}
              </ul>
            </address>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-white/10 font-medium">
            <p className={`${isDark ? 'text-gray-500' : 'text-gray-500'} text-sm`}>
              © {new Date().getFullYear()} Auto City Qatar. {t.footer.rights}
            </p>
            <Link href="/autocityPro/login" className={`${isDark ? 'text-gray-500' : 'text-gray-500'} hover:text-[#E84545] transition-colors text-sm font-bold`}>
              {t.nav.Login}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}