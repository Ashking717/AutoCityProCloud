'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Wrench, Shield, ArrowRight, Phone, Mail, MapPin, ChevronDown, Clock, Disc3, Sparkles, PaintBucket, Sun, Repeat, Sofa, Settings, Globe } from 'lucide-react';

// Content translations
const content = {
  en: {
    nav: {
      services: 'Services',
      about: 'About',
      branches: 'Branches',
      contact: 'Contact',
      Login: 'Login',
    },
    hero: {
      badge: 'Premium Car Accessories in Qatar',
      title1: 'Elevate Your',
      title2: 'Drive',
      subtitle: 'Auto City Car Accessories',
      description: 'Your trusted destination for vehicle facelifts, stereo upgrades, genuine parts, interior & exterior enhancements, and professional tinting services across Qatar.',
      cta1: 'Our Services',
      cta2: 'Contact Us',
      stats: [
        { value: '3', label: 'Branches' },
        { value: '8+', label: 'Services' },
        { value: '100%', label: 'Quality' },
      ],
    },
    services: {
      label: 'Our Services',
      title: 'What We Offer',
      description: 'Comprehensive automotive solutions to transform and maintain your vehicle',
      items: [
        {
          title: 'Vehicle Facelift',
          description: 'Transform your vehicle with our comprehensive facelift services. Modernize your car\'s appearance with updated styling elements.',
        },
        {
          title: 'Stereo Upgradation',
          description: 'Upgrade your audio experience with premium sound systems, speakers, and multimedia units from leading brands.',
        },
        {
          title: 'Genuine Parts',
          description: 'OEM certified parts sourced directly from manufacturers. Quality guaranteed for perfect fit and performance.',
        },
        {
          title: 'Aftermarket Parts',
          description: 'High-quality aftermarket alternatives offering excellent value without compromising on performance.',
        },
        {
          title: 'Interior Upgradation',
          description: 'Elevate your cabin with premium upholstery, custom trims, ambient lighting, and comfort accessories.',
        },
        {
          title: 'Exterior Detailing',
          description: 'Professional detailing services including paint correction, ceramic coating, and protective films.',
        },
        {
          title: 'Window Tinting',
          description: 'Premium window films for UV protection, privacy, and heat reduction. Multiple shades available.',
        },
        {
          title: 'Vehicle Type Conversion',
          description: 'Specialized conversion services to transform your vehicle\'s configuration to meet your specific needs.',
        },
      ],
    },
    about: {
      label: 'About Us',
      title: 'Your Trusted Partner',
      description1: 'Auto City Qatar is a leading destination for car accessories and automotive services. We serve vehicle owners across Qatar with a strong focus on quality, reliability, and customer satisfaction.',
      description2: 'With three strategically located branches in Doha and an experienced team, we ensure premium automotive solutions are always within reach.',
      features: [
        'Vehicle Facelift',
        'Stereo Systems',
        'Genuine Parts',
        'Aftermarket Parts',
        'Interior Upgrades',
        'Exterior Detailing',
        'Window Tinting',
        'Type Conversion',
      ],
    },
    branches: {
      label: 'Locations',
      title: 'Our Branches',
      description: 'Visit any of our three convenient locations across Doha',
      items: [
        { name: 'Al Gharafa', area: 'Doha' },
        { name: 'Muaither', area: 'Doha' },
        { name: 'Al Mesila', area: 'Doha' },
      ],
    },
    contact: {
      label: 'Contact',
      title: 'Get in Touch',
      description: 'Reach out to us — we\'re here to help with all your automotive needs',
      callUs: 'Call Us',
      callUsDesc: 'We\'re available during business hours',
      emailUs: 'Email Us',
      businessHours: 'Business Hours',
      satThu: 'Saturday – Thursday',
      friday: 'Friday',
    },
    footer: {
      description: 'Premium car accessories, genuine parts, and professional automotive services — your complete solution in Qatar.',
      services: 'Services',
      contact: 'Contact',
      ourBranches: 'Our Branches',
      rights: 'All rights reserved.',
    },
  },
  ar: {
    nav: {
      services: 'خدماتنا',
      about: 'من نحن',
      branches: 'فروعنا',
      contact: 'اتصل بنا',
      Login: 'بوابة الموظفين',
    },
    hero: {
      badge: 'إكسسوارات سيارات فاخرة في قطر',
      title1: 'ارتقِ',
      title2: 'بقيادتك',
      subtitle: 'اوتو سيتي لزينة السيارات',
      description: 'وجهتك الموثوقة لتجديد المركبات، ترقية أنظمة الصوت، قطع الغيار الأصلية، التحسينات الداخلية والخارجية، وخدمات التظليل الاحترافية في قطر.',
      cta1: 'خدماتنا',
      cta2: 'اتصل بنا',
      stats: [
        { value: '٣', label: 'فروع' },
        { value: '+٨', label: 'خدمات' },
        { value: '١٠٠٪', label: 'جودة' },
      ],
    },
    services: {
      label: 'خدماتنا',
      title: 'ماذا نقدم',
      description: 'حلول سيارات شاملة لتحويل وصيانة سيارتك',
      items: [
        {
          title: 'تجديد المركبات',
          description: 'قم بتحويل سيارتك مع خدمات التجديد الشاملة لدينا. حدّث مظهر سيارتك بعناصر تصميم عصرية.',
        },
        {
          title: 'ترقية أنظمة الصوت',
          description: 'قم بترقية تجربتك الصوتية مع أنظمة صوت متميزة ومكبرات صوت ووحدات وسائط متعددة من أفضل العلامات التجارية.',
        },
        {
          title: 'قطع غيار أصلية',
          description: 'قطع غيار معتمدة من الشركة المصنعة مباشرة. جودة مضمونة للملاءمة والأداء المثالي.',
        },
        {
          title: 'قطع غيار بديلة',
          description: 'بدائل عالية الجودة توفر قيمة ممتازة دون المساس بالأداء.',
        },
        {
          title: 'ترقية المقصورة الداخلية',
          description: 'ارتقِ بمقصورتك مع تنجيد فاخر وزخارف مخصصة وإضاءة محيطية وإكسسوارات راحة.',
        },
        {
          title: 'تفصيل خارجي',
          description: 'خدمات تفصيل احترافية تشمل تصحيح الطلاء والطلاء السيراميكي والأفلام الواقية.',
        },
        {
          title: 'تظليل النوافذ',
          description: 'أفلام نوافذ متميزة للحماية من الأشعة فوق البنفسجية والخصوصية وتقليل الحرارة. درجات متعددة متاحة.',
        },
        {
          title: 'تحويل نوع المركبة',
          description: 'خدمات تحويل متخصصة لتغيير تكوين سيارتك لتلبية احتياجاتك الخاصة.',
        },
      ],
    },
    about: {
      label: 'من نحن',
      title: 'شريكك الموثوق',
      description1: 'اوتو سيتي قطر هي الوجهة الرائدة لإكسسوارات السيارات وخدمات السيارات. نخدم أصحاب المركبات في جميع أنحاء قطر مع التركيز القوي على الجودة والموثوقية ورضا العملاء.',
      description2: 'مع ثلاثة فروع في مواقع استراتيجية في الدوحة وفريق من ذوي الخبرة، نضمن أن حلول السيارات المتميزة دائماً في متناول اليد.',
      features: [
        'تجديد المركبات',
        'أنظمة الصوت',
        'قطع غيار أصلية',
        'قطع غيار بديلة',
        'ترقية داخلية',
        'تفصيل خارجي',
        'تظليل النوافذ',
        'تحويل النوع',
      ],
    },
    branches: {
      label: 'المواقع',
      title: 'فروعنا',
      description: 'قم بزيارة أي من فروعنا الثلاثة في الدوحة',
      items: [
        { name: 'الغرافة', area: 'الدوحة' },
        { name: 'معيذر', area: 'الدوحة' },
        { name: 'المسيلة', area: 'الدوحة' },
      ],
    },
    contact: {
      label: 'اتصل بنا',
      title: 'تواصل معنا',
      description: 'تواصل معنا — نحن هنا لمساعدتك في جميع احتياجات سيارتك',
      callUs: 'اتصل بنا',
      callUsDesc: 'نحن متاحون خلال ساعات العمل',
      emailUs: 'راسلنا',
      businessHours: 'ساعات العمل',
      satThu: 'السبت – الخميس',
      friday: 'الجمعة',
    },
    footer: {
      description: 'إكسسوارات سيارات فاخرة، قطع غيار أصلية، وخدمات سيارات احترافية — حلك الكامل في قطر.',
      services: 'الخدمات',
      contact: 'اتصل بنا',
      ourBranches: 'فروعنا',
      rights: 'جميع الحقوق محفوظة.',
    },
  },
};

const serviceIcons = [Sparkles, Disc3, Shield, Settings, Sofa, PaintBucket, Sun, Repeat];

const phoneNumbers = [
  '+974 5086 7676',
  '+974 6664 2884',
  '+974 7730 3968',
];

export default function HomePage() {
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const t = content[lang];
  const isRTL = lang === 'ar';

  return (
    <div className={`min-h-screen bg-[#050505] text-white overflow-x-hidden ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Custom Styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap');
        
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
          background: #0A0A0A;
        }
        ::-webkit-scrollbar-thumb {
          background: #E84545;
          border-radius: 4px;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(60px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes pulse-ring {
          0% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
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
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .glass-dark {
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
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
          opacity: 0.015;
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
      `}</style>

      <div className="noise" />

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="glass-dark">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              {/* Logo */}
              <Link href="/" className="relative h-12 w-48">
                <Image
                  src="/logo.png"
                  alt="Auto City Qatar"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </Link>

              {/* Nav Links */}
              <nav className="hidden lg:flex items-center gap-10">
                {[
                  { key: 'services', href: '#services' },
                  { key: 'about', href: '#about' },
                  { key: 'branches', href: '#branches' },
                  { key: 'contact', href: '#contact' },
                ].map((item) => (
                  <a
                    key={item.key}
                    href={item.href}
                    className="text-sm font-medium text-gray-400 hover:text-[#E84545] transition-colors duration-300 relative group"
                  >
                    {t.nav[item.key as keyof typeof t.nav]}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#E84545] group-hover:w-full transition-all duration-300" />
                  </a>
                ))}
              </nav>

              {/* Language Selector & CTA */}
              <div className="flex items-center gap-4">
                {/* Language Toggle */}
                <button
                  onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:border-[#E84545]/50 transition-colors"
                >
                  <Globe className="w-4 h-4 text-[#E84545]" />
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
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full opacity-10 bg-[#E84545] blur-[150px]" />
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `
                linear-gradient(to right, #E84545 1px, transparent 1px),
                linear-gradient(to bottom, #E84545 1px, transparent 1px)
              `,
              backgroundSize: '80px 80px'
            }}
          />
          <div 
            className="absolute top-0 right-0 w-1/2 h-full opacity-[0.03]"
            style={{
              backgroundImage: `repeating-linear-gradient(
                -45deg,
                #E84545,
                #E84545 1px,
                transparent 1px,
                transparent 60px
              )`
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Content */}
            <div>
              <div className="animate-fade-in-up inline-flex items-center gap-3 px-4 py-2 rounded-full border border-[#E84545]/30 bg-[#E84545]/5 mb-8">
                <span className="w-2 h-2 rounded-full bg-[#E84545] animate-pulse" />
                <span className="text-sm text-gray-300">{t.hero.badge}</span>
              </div>

              <h1 className="animate-fade-in-up delay-100">
                <span className="block text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-4">
                  {t.hero.title1}
                </span>
                <span className="block text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#E84545]">
                  {t.hero.title2}
                </span>
              </h1>

              <p className="animate-fade-in-up delay-200 text-xl text-gray-500 mt-6 mb-8">
                {t.hero.subtitle}
              </p>

              <p className="animate-fade-in-up delay-300 text-lg text-gray-400 max-w-lg mb-10 leading-relaxed">
                {t.hero.description}
              </p>

              <div className="animate-fade-in-up delay-400 flex flex-wrap gap-4">
                <a
                  href="#services"
                  className={`group inline-flex items-center gap-2 px-8 py-4 bg-[#E84545] text-white font-semibold rounded-lg hover:bg-[#cc3c3c] transition-all duration-300 hover-glow`}
                >
                  {t.hero.cta1}
                  <ArrowRight className={`w-5 h-5 group-hover:translate-x-1 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                </a>
                <a
                  href="#contact"
                  className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 text-white font-semibold rounded-lg hover:border-[#E84545] hover:text-[#E84545] transition-all duration-300"
                >
                  {t.hero.cta2}
                </a>
              </div>

              <div className="animate-fade-in-up delay-500 flex gap-12 mt-16 pt-10 border-t border-white/10">
                {t.hero.stats.map((stat, i) => (
                  <div key={i}>
                    <div className="text-3xl font-bold text-[#E84545]">{stat.value}</div>
                    <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Visual */}
            <div className="animate-scale-in delay-300 relative hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[400px] h-[400px] border border-[#E84545]/10 rounded-full" />
                  <div className="absolute w-[500px] h-[500px] border border-[#E84545]/5 rounded-full" />
                  <div 
                    className="absolute w-[300px] h-[300px] border-2 border-[#E84545]/20 rounded-full"
                    style={{ animation: 'pulse-ring 3s ease-out infinite' }}
                  />
                </div>
                
                <div className="relative w-[400px] h-[400px] mx-auto flex items-center justify-center">
                  <div className="glass rounded-3xl p-12 hover-lift">
                    <Image
                      src="/logo.png"
                      alt="Auto City"
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
          <a href="#services" className="flex flex-col items-center gap-2 text-gray-500 hover:text-[#E84545] transition-colors">
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </a>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="relative py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <span className="text-[#E84545] text-sm font-semibold tracking-[0.2em] uppercase">{t.services.label}</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 relative inline-block line-accent line-accent-center">
              {t.services.title}
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto mt-8">
              {t.services.description}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.services.items.map((service, i) => {
              const Icon = serviceIcons[i];
              return (
                <div
                  key={i}
                  className="group relative p-6 lg:p-8 bg-[#0A0A0A] border border-white/5 rounded-2xl hover:border-[#E84545]/30 hover-lift transition-all duration-500"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#E84545]/10 flex items-center justify-center mb-5 group-hover:bg-[#E84545] transition-colors duration-300">
                    <Icon className="w-6 h-6 text-[#E84545] group-hover:text-white transition-colors duration-300" />
                  </div>

                  <h3 className="text-lg font-bold mb-3">{service.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{service.description}</p>

                  <div className="absolute bottom-0 left-0 w-full h-1 bg-[#E84545] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-b-2xl" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative py-32 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#E84545] text-sm font-semibold tracking-[0.2em] uppercase">{t.about.label}</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-8 relative line-accent">
                {t.about.title}
              </h2>
              
              <p className="text-gray-400 text-lg mb-6 leading-relaxed">
                {t.about.description1}
              </p>
              
              <p className="text-gray-400 text-lg mb-10 leading-relaxed">
                {t.about.description2}
              </p>

              <div className="grid grid-cols-2 gap-4">
                {t.about.features.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#E84545]" />
                    <span className="text-gray-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="glass rounded-3xl p-10 lg:p-16">
                <div className="text-center">
                  <Image
                    src="/logo.png"
                    alt="Auto City"
                    width={350}
                    height={175}
                    className="mx-auto mb-8"
                  />
                  <div className="space-y-2">
                    <p className="text-xl font-semibold">{lang === 'en' ? 'Auto City Qatar' : 'اوتو سيتي قطر'}</p>
                    <p className="text-lg text-gray-500">{lang === 'en' ? 'Car Accessories' : 'لزينة السيارات'}</p>
                  </div>
                </div>
              </div>
              
              <div className={`absolute -top-4 ${isRTL ? '-left-4' : '-right-4'} w-24 h-24 border-t-2 ${isRTL ? 'border-l-2 rounded-tl-3xl' : 'border-r-2 rounded-tr-3xl'} border-[#E84545]/30`} />
              <div className={`absolute -bottom-4 ${isRTL ? '-right-4' : '-left-4'} w-24 h-24 border-b-2 ${isRTL ? 'border-r-2 rounded-br-3xl' : 'border-l-2 rounded-bl-3xl'} border-[#E84545]/30`} />
            </div>
          </div>
        </div>
      </section>

      {/* Branches Section */}
      <section id="branches" className="relative py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#E84545] text-sm font-semibold tracking-[0.2em] uppercase">{t.branches.label}</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 relative inline-block line-accent line-accent-center">
              {t.branches.title}
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto mt-8">
              {t.branches.description}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {t.branches.items.map((branch, i) => (
              <div
                key={i}
                className="group p-8 bg-[#0A0A0A] border border-white/5 rounded-2xl text-center hover:border-[#E84545]/30 hover-lift transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-full bg-[#E84545]/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-[#E84545] transition-colors duration-300">
                  <MapPin className="w-7 h-7 text-[#E84545] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-xl font-bold mb-2">{branch.name}</h3>
                <p className="text-gray-500">{branch.area}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative py-32 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#E84545] text-sm font-semibold tracking-[0.2em] uppercase">{t.contact.label}</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 relative inline-block line-accent line-accent-center">
              {t.contact.title}
            </h2>
            <p className="text-gray-400 text-lg mt-8">
              {t.contact.description}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Phone Numbers */}
            <div className="glass rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-[#E84545]/10 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-[#E84545]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{t.contact.callUs}</h3>
                  <p className="text-gray-500 text-sm">{t.contact.callUsDesc}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {phoneNumbers.map((phone, i) => (
                  <a
                    key={i}
                    href={`tel:${phone.replace(/\s/g, '')}`}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-[#E84545]/10 transition-colors group"
                    dir="ltr"
                  >
                    <span className="text-lg font-medium">{phone}</span>
                    <ArrowRight className={`w-5 h-5 text-gray-500 group-hover:text-[#E84545] group-hover:translate-x-1 transition-all`} />
                  </a>
                ))}
              </div>
            </div>

            {/* Business Hours & Email */}
            <div className="space-y-6">
              {/* Email */}
              <div className="glass rounded-2xl p-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#E84545]/10 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-[#E84545]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{t.contact.emailUs}</h3>
                    <a href="mailto:info@autocityqatar.com" className="text-gray-400 hover:text-[#E84545] transition-colors">
                      info@autocityqatar.com
                    </a>
                  </div>
                </div>
              </div>

              {/* Business Hours */}
              <div className="glass rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#E84545]/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-[#E84545]" />
                  </div>
                  <h3 className="text-lg font-bold">{t.contact.businessHours}</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-gray-400">{t.contact.satThu}</span>
                    <span className="font-medium" dir="ltr">8:00 AM – 8:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-400">{t.contact.friday}</span>
                    <span className="font-medium" dir="ltr">2:00 PM – 8:00 PM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            {/* Brand */}
            <div className="md:col-span-2">
              <Image
                src="/logo.png"
                alt="Auto City Qatar"
                width={180}
                height={90}
                className="mb-6"
              />
              <p className="text-gray-500 max-w-sm leading-relaxed mb-6">
                {t.footer.description}
              </p>
              <p className="text-[#E84545]">
                {lang === 'en' ? 'اوتو سيتي لزينة السيارات' : 'Auto City Car Accessories'}
              </p>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-semibold mb-6">{t.footer.services}</h4>
              <ul className="space-y-3 text-gray-500">
                {t.services.items.slice(0, 5).map((service, i) => (
                  <li key={i}>{service.title}</li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold mb-6">{t.footer.contact}</h4>
              <ul className="space-y-3 text-gray-500">
                {phoneNumbers.map((phone, i) => (
                  <li key={i} dir="ltr">
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
            </div>
          </div>

          {/* Branches */}
          <div className="py-8 border-t border-b border-white/5 mb-8">
            <div className="flex flex-wrap items-center justify-center gap-8 text-gray-500">
              <span className="text-sm font-medium text-white">{t.footer.ourBranches}:</span>
              {t.branches.items.map((branch, i) => (
                <span key={i} className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#E84545]" />
                  {branch.name}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} {lang === 'en' ? 'Auto City Qatar' : 'اوتو سيتي قطر'}. {t.footer.rights}
            </p>
            <Link 
              href="/autocityPro/login" 
              className="text-gray-500 hover:text-[#E84545] transition-colors text-sm"
            >
              {t.nav.Login}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}