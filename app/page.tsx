'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Wrench, Shield, ArrowRight, Phone, Mail, MapPin, ChevronDown, Clock, Disc3, Sparkles, PaintBucket, Sun, Repeat, Sofa, Settings, Globe, Moon, Play, Pause, X, Activity, Cpu, Database, Package } from 'lucide-react';

// ─── Time-based theme hook ────────────────────────────────────────────────────
function useTimeBasedTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => { const h = new Date().getHours(); setIsDark(h < 6 || h >= 18); };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);
  return isDark;
}

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
    stats: Array<{ value: string; label: string; icon: any }>;
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

// Content translations (Restored to Original)
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
        { value: '3', label: 'Doha Branches', icon: MapPin },
        { value: '8+', label: 'Services', icon: Wrench },
        { value: '10K+', label: 'Products', icon: Package },
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
        { value: '٣', label: 'فروع في الدوحة', icon: MapPin },
        { value: '+٨', label: 'خدمات', icon: Wrench },
        { value: '+١٠K', label: 'منتج', icon: Package },
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
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

  :root {
    /* Light Mode Tech Theme */
    --bg-base: #f8f9fa;
    --bg-panel: #ffffff;
    --bg-panel-alpha: rgba(255, 255, 255, 0.9);
    --panel-border: rgba(0,0,0,0.08);
    --accent-primary: #ff2a2a;
    --text-primary: #111827;
    --text-muted: #6b7280;
    --text-dark: #9ca3af;
    --input-bg: #f3f4f6;
    --grid-color: rgba(0,0,0,0.03);
    --shadow-color: rgba(0,0,0,0.05);
    --error-bg: rgba(255,42,42,0.08);
    --error-border: rgba(255,42,42,0.2);
  }

  .theme-dark {
    /* Dark Mode Tech Theme */
    --bg-base: #050505;
    --bg-panel: #0d0d10;
    --bg-panel-alpha: rgba(13, 13, 16, 0.9);
    --panel-border: rgba(255, 255, 255, 0.05);
    --accent-primary: #ff2a2a;
    --text-primary: #ffffff;
    --text-muted: #8a8a93;
    --text-dark: #4a4a52;
    --input-bg: #050505;
    --grid-color: rgba(255,255,255,0.02);
    --shadow-color: rgba(0,0,0,0.8);
    --error-bg: rgba(255,42,42,0.1);
    --error-border: rgba(255,42,42,0.2);
  }

  * { -webkit-tap-highlight-color: transparent; }

  .ltr { direction: ltr; font-family: 'Space Grotesk', sans-serif; }
  .rtl { direction: rtl; font-family: 'Cairo', sans-serif; }

  /* Dashboard Bento Panels */
  .dash-panel {
    background: var(--bg-panel);
    border: 1px solid var(--panel-border);
    border-radius: 24px;
    position: relative;
    box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.02), 0 10px 30px -10px var(--shadow-color);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .dash-panel::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--panel-border), transparent);
    z-index: 1;
  }
  .dash-panel:hover {
    border-color: rgba(232, 69, 69, 0.3);
    box-shadow: inset 0 1px 0 0 rgba(232, 69, 69, 0.2), 0 0 30px -5px rgba(232, 69, 69, 0.1);
  }

  .input-tech {
    background: var(--input-bg);
    border: 1px solid var(--panel-border);
    color: var(--text-primary);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .input-tech:focus {
    border-color: var(--accent-primary);
    background: rgba(255,42,42,0.02);
    box-shadow: 0 0 15px rgba(255,42,42,0.15), inset 0 0 10px rgba(255,42,42,0.05);
  }
  .input-tech::placeholder { color: var(--text-muted); opacity: 0.6; }

  .btn-system {
    border-radius: 99px;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
    text-transform: uppercase;
  }
  .btn-system:hover {
    border-color: var(--accent-primary);
    background: rgba(232, 69, 69, 0.05);
    box-shadow: 0 0 15px rgba(232, 69, 69, 0.2), inset 0 0 10px rgba(232, 69, 69, 0.1);
    color: var(--accent-primary);
  }
  
  .btn-primary {
    background: linear-gradient(135deg, rgba(255,42,42,0.1), rgba(255,94,0,0.1));
    border: 1px solid var(--accent-primary);
    color: var(--accent-primary);
    box-shadow: 0 0 20px rgba(255,42,42,0.15), inset 0 0 10px rgba(255,42,42,0.1);
  }
  .btn-primary:hover:not(:disabled) {
    background: var(--accent-primary);
    color: #fff;
    box-shadow: 0 0 30px rgba(255,42,42,0.4);
    transform: translateY(-1px);
  }
  .btn-primary:active:not(:disabled) {
    transform: scale(0.98);
  }

  .metric-dot {
    display: inline-block; width: 6px; height: 6px;
    background-color: var(--accent-primary); border-radius: 50%;
    box-shadow: 0 0 8px var(--accent-primary);
    animation: pulse-glow 2s infinite;
  }
  @keyframes pulse-glow {
    0% { box-shadow: 0 0 0 0 rgba(255,42,42, 0.4); }
    70% { box-shadow: 0 0 0 6px rgba(255,42,42, 0); }
    100% { box-shadow: 0 0 0 0 rgba(255,42,42, 0); }
  }
  
  .text-glow-accent {
    color: var(--accent-primary);
    text-shadow: 0 0 15px rgba(255,42,42,0.5);
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-up {
    animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
  }
  .delay-100 { animation-delay: 0.1s; }
  .delay-200 { animation-delay: 0.2s; }
  .delay-300 { animation-delay: 0.3s; }
`;

export default function HomePage() {
  const router = useRouter();
  const isDark = useTimeBasedTheme();
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [mounted, setMounted] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ src: string; type: MediaType; title: string } | null>(null);
  
  const t = content[lang];
  const isRTL = lang === 'ar';

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div suppressHydrationWarning className={`min-h-screen text-[var(--text-primary)] bg-[var(--bg-base)] overflow-x-hidden transition-colors duration-700 ${isRTL ? 'rtl' : 'ltr'} ${isDark ? 'theme-dark' : 'theme-light'}`}>
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: styles }} />

      {/* Grid Overlay for Tech Vibe */}
      <div className="fixed inset-0 pointer-events-none z-0" 
           style={{ 
             backgroundImage: `linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)`, 
             backgroundSize: '40px 40px',
             maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 80%)',
             WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 80%)'
           }} 
      />
      {isDark && (
        <div className="fixed inset-0 pointer-events-none z-0"
             style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255, 42, 42, 0.03), transparent 60%)' }} />
      )}

      {/* Media Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all" onClick={() => setSelectedMedia(null)}>
          <button
            onClick={() => setSelectedMedia(null)}
            className="absolute top-6 right-6 w-12 h-12 rounded-full flex items-center justify-center bg-[var(--input-bg)] border border-[var(--panel-border)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative max-w-6xl w-full dash-panel p-2 animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-6 px-4 py-3 border-b border-[var(--panel-border)] mb-2">
               <div className="flex gap-2">
                 <div className="w-2.5 h-2.5 rounded-full bg-[#ff453a] shadow-[0_0_5px_#ff453a]"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-[#ffd60a]"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-[#32d74b]"></div>
               </div>
               <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-widest">{selectedMedia.title}</span>
            </div>
            <div className="rounded-xl overflow-hidden bg-[var(--input-bg)] relative">
                {selectedMedia.type === 'video' ? (
                <video src={selectedMedia.src} controls autoPlay className="w-full h-auto" />
                ) : (
                <Image src={selectedMedia.src} alt={selectedMedia.title} width={1200} height={675} className="w-full h-auto" />
                )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Matrix */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-[var(--panel-border)] transition-colors duration-700" style={{ backgroundColor: 'var(--bg-panel-alpha)' }}>
        <nav className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="relative h-10 w-40 opacity-90 hover:opacity-100 transition-opacity">
              <Image
                src="/login.png"
                alt="Auto City Qatar"
                fill
                sizes="160px"
                className="object-contain"
                priority
              />
            </Link>

            <ul className="hidden lg:flex items-center gap-8 bg-[var(--input-bg)] px-8 py-3 rounded-full border border-[var(--panel-border)]">
              {['services', 'showcase', 'about', 'branches', 'contact'].map((key) => (
                <li key={key}>
                  <a
                    href={`#${key}`}
                    className="text-xs uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors font-semibold"
                  >
                    {t.nav[key as keyof typeof t.nav]}
                  </a>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--panel-border)] text-[var(--text-muted)] transition-all duration-500 shadow-sm mr-2">
                {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </div>

              <button
                onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
                className="btn-system px-4 py-2 text-xs flex items-center gap-2 border-[var(--panel-border)] text-[var(--text-primary)]"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'العربية' : 'EN'}</span>
              </button>

              <Link
                href="/autocityPro/login"
                className="hidden md:flex btn-system btn-primary px-6 py-2 text-xs font-bold"
              >
                {t.nav.Login}
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Core Initialization (Hero) */}
      <section className="relative min-h-screen flex items-center pt-32 pb-20 z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7">
              <div className="animate-fade-up inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--input-bg)] mb-8">
                <span className="metric-dot"></span>
                <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-primary)]">{t.hero.badge}</span>
              </div>

              <h1 className="animate-fade-up delay-100 mb-6 text-glow">
                <span className="block text-5xl md:text-7xl font-bold tracking-tighter mb-1 text-[var(--text-primary)]">
                  {t.hero.title1}
                </span>
                <span className="block text-5xl md:text-7xl font-bold tracking-tighter text-glow-accent">
                  {t.hero.title2}
                </span>
              </h1>

              <p className="animate-fade-up delay-200 text-lg md:text-xl font-medium text-[var(--text-muted)] mb-6 max-w-2xl">
                {t.hero.subtitle}
              </p>

              <p className="animate-fade-up delay-300 text-sm md:text-base text-[var(--text-dark)] mb-10 leading-relaxed max-w-xl font-mono">
                {t.hero.description}
              </p>

              <div className="animate-fade-up delay-300 flex flex-wrap gap-4">
                <a href="#services" className="btn-system btn-primary px-8 py-4 flex items-center gap-3 font-bold">
                  {t.hero.cta1}
                  <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                </a>
                <a href="#contact" className="btn-system px-8 py-4 font-bold border border-[var(--panel-border)] bg-[var(--bg-panel)] text-[var(--text-primary)]">
                  {t.hero.cta2}
                </a>
              </div>
            </div>

            {/* Right Dashboard Element */}
            <div className="lg:col-span-5 animate-fade-up delay-200">
              <div className="dash-panel p-6 flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-[var(--panel-border)] pb-4">
                   <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-widest">{t.about.label}</span>
                </div>
                
                <div className="grid grid-cols-1 gap-4 mt-2">
                  {t.hero.stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="flex items-center justify-between p-4 rounded-xl bg-[var(--input-bg)] border border-[var(--panel-border)] group hover:border-[var(--accent-primary)] transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[var(--bg-panel)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors border border-[var(--panel-border)]">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">{stat.label}</div>
                        </div>
                        <div className="text-2xl font-bold font-mono text-glow-accent">{stat.value}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Diagnostics / Showcase */}
      <section id="showcase" className="relative py-24 border-y border-[var(--panel-border)] bg-[var(--bg-panel)] z-10 transition-colors duration-700">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[var(--panel-border)] pb-8">
            <div>
              <span className="text-[var(--accent-primary)] text-xs font-mono tracking-widest uppercase mb-2 flex items-center gap-2">
                <Activity className="w-3 h-3" /> {t.showcase.label}
              </span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]">
                {t.showcase.title}
              </h2>
            </div>
            <p className="text-[var(--text-muted)] font-mono text-sm max-w-md">
              {t.showcase.description}
            </p>
          </header>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Primary Feed */}
            <div className="lg:col-span-2 dash-panel group cursor-pointer" onClick={() => setSelectedMedia({ src: t.showcase.items[0].media, type: t.showcase.items[0].type, title: t.showcase.items[0].title })}>
              <div className="p-4 border-b border-[var(--panel-border)] flex justify-between items-center">
                <span className="text-xs font-mono text-[var(--text-muted)]">{t.showcase.items[0].title}</span>
                <Play className="w-4 h-4 text-[var(--accent-primary)] opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="relative h-[400px] bg-[var(--input-bg)]">
                {t.showcase.items[0].type === 'video' ? (
                  <video src={t.showcase.items[0].media} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" autoPlay loop muted playsInline />
                ) : (
                  <Image src={t.showcase.items[0].media} alt={t.showcase.items[0].title} width={800} height={400} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                )}
                <div className="absolute bottom-0 left-0 right-0 p-8" style={{ background: 'linear-gradient(to top, var(--bg-panel) 0%, transparent 100%)' }}>
                  <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{t.showcase.items[0].title}</h3>
                  <p className="text-[var(--text-dark)] text-sm font-mono">{t.showcase.items[0].description}</p>
                </div>
              </div>
            </div>

            {/* Secondary Feeds Grid */}
            <div className="grid grid-rows-2 gap-6">
               {t.showcase.items.slice(1, 3).map((item) => (
                  <div key={item.title} className="dash-panel group cursor-pointer" onClick={() => setSelectedMedia({ src: item.media, type: item.type, title: item.title })}>
                    <div className="p-3 border-b border-[var(--panel-border)] flex justify-between items-center">
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">{item.title}</span>
                    </div>
                    <div className="relative h-[155px] bg-[var(--input-bg)]">
                      {item.type === 'video' ? (
                        <video src={item.media} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" autoPlay loop muted playsInline />
                      ) : (
                        <Image src={item.media} alt={item.title} width={400} height={200} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: 'linear-gradient(to top, var(--bg-panel) 0%, transparent 100%)' }}>
                        <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">{item.title}</h4>
                      </div>
                    </div>
                  </div>
               ))}
            </div>
          </div>
        </div>
      </section>

      {/* Modules (Services) */}
      <section id="services" className="relative py-24 z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <header className="mb-16 text-center">
            <span className="text-[var(--accent-primary)] text-xs font-mono tracking-widest uppercase mb-4 block">
             {t.services.label}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--text-primary)] mb-4">
              {t.services.title}
            </h2>
            <p className="text-[var(--text-muted)] text-sm max-w-2xl mx-auto">
              {t.services.description}
            </p>
          </header>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {t.services.items.map((service, i) => {
              const Icon = serviceIcons[i];
              return (
                <article key={service.title} className="dash-panel p-6 flex flex-col group">
                  <div className="flex items-center justify-between mb-8">
                    <Icon className="w-6 h-6 text-[var(--text-dark)] group-hover:text-[var(--accent-primary)] transition-colors" />
                    <span className="text-[10px] font-mono text-[var(--text-dark)]">0{i+1}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{service.title}</h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed font-mono mt-auto">{service.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Network Nodes (Branches) & Contact */}
      <section id="branches" className="relative py-24 border-t border-[var(--panel-border)] bg-[var(--bg-panel)] z-10 transition-colors duration-700">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            
            {/* Architecture Details */}
            <div>
              <span className="text-[var(--accent-primary)] text-xs font-mono tracking-widest uppercase mb-4 block">
                {t.branches.label}
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-8">
                {t.branches.title}
              </h2>
              
              <div className="space-y-4">
                {t.branches.items.map((branch, i) => (
                  <div key={branch.name} className="dash-panel p-5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <MapPin className="w-4 h-4 text-[var(--accent-primary)] opacity-80" />
                        <h3 className="font-bold text-[var(--text-primary)] font-mono text-sm uppercase">{branch.name}</h3>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] pl-7">{branch.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Secure Gateway / Contact */}
            <div id="contact" className="dash-panel p-8">
              <div className="border-b border-[var(--panel-border)] pb-6 mb-6 text-center">
                 <Shield className="w-8 h-8 text-[var(--accent-primary)] mx-auto mb-4 opacity-80" />
                 <h3 className="text-xl font-bold tracking-widest uppercase text-[var(--text-primary)]">{t.contact.title}</h3>
                 <p className="text-xs text-[var(--text-muted)] font-mono mt-2">{t.contact.description}</p>
              </div>

              <div className="space-y-6">
                <div className="bg-[var(--input-bg)] p-4 rounded-xl border border-[var(--panel-border)]">
                  <div className="text-[10px] font-mono text-[var(--text-muted)] mb-3 uppercase tracking-widest">{t.contact.callUs}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {phoneNumbers.map((phone) => (
                      <a key={phone} href={`tel:${phone.replace(/\s/g, '')}`} className="btn-system text-xs py-2 text-center border border-[var(--panel-border)] bg-[var(--bg-panel)] hover:border-[var(--accent-primary)]" dir="ltr">
                        {phone}
                      </a>
                    ))}
                  </div>
                </div>

                <div className="bg-[var(--input-bg)] p-4 rounded-xl border border-[var(--panel-border)] flex justify-between items-center">
                  <div>
                     <div className="text-[10px] font-mono text-[var(--text-muted)] mb-1 uppercase tracking-widest">{t.contact.emailUs}</div>
                     <a href="mailto:info@autocityqatar.com" className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors">info@autocityqatar.com</a>
                  </div>
                  <Mail className="w-5 h-5 text-[var(--text-dark)]" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Terminal Footer */}
      <footer className="relative border-t border-[var(--panel-border)] bg-[var(--bg-base)] z-10 pb-8 transition-colors duration-700">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 font-mono text-xs">
            <div className="flex items-center gap-4">
              <Image src="/login.png" onClick={() => router.push('/autocityPro/login')} alt="Auto City Qatar" width={100} height={40} className="opacity-50 grayscale cursor-pointer hover:opacity-80 transition-opacity" />
              <p className="text-[var(--text-muted)] border-l border-[var(--panel-border)] pl-4 py-1">
                {t.footer.rights}
              </p>
            </div>
            
            <div className="flex gap-6 text-[var(--text-muted)]">
               <a href="#services" className="hover:text-[var(--text-primary)] transition-colors">{t.footer.services}</a>
               <a href="#branches" className="hover:text-[var(--text-primary)] transition-colors">{t.footer.ourBranches}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}