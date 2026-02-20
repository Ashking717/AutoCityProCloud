'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import {
  TrendingUp, Scale, DollarSign, ShoppingCart, Package, Users,
  FileText, Calendar, Activity, BarChart3, ChevronLeft, Download,
  Clock, Zap, TrendingDown, AlertCircle, Sun, Moon,
} from 'lucide-react';

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

export default function ReportsPage() {
  const router = useRouter();
  const isDark = useTimeBasedTheme();
  const [user, setUser] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    pageBg:            isDark ? '#050505'                                             : '#f3f4f6',
    // Dynamic island
    islandBg:          isDark ? '#000000'                                             : '#ffffff',
    islandBorder:      isDark ? 'rgba(255,255,255,0.10)'                              : 'rgba(0,0,0,0.10)',
    islandText:        isDark ? '#ffffff'                                             : '#111827',
    islandDivider:     isDark ? 'rgba(255,255,255,0.20)'                              : 'rgba(0,0,0,0.12)',
    // Mobile header
    mobileHdrBg:       isDark ? 'linear-gradient(135deg,#0A0A0A,#050505,#0A0A0A)'    : 'linear-gradient(135deg,#ffffff,#f9fafb,#ffffff)',
    mobileHdrBorder:   isDark ? 'rgba(255,255,255,0.05)'                              : 'rgba(0,0,0,0.08)',
    mobileHdrTitle:    isDark ? '#ffffff'                                             : '#111827',
    mobileHdrSub:      isDark ? 'rgba(255,255,255,0.60)'                              : '#6b7280',
    mobileBtnBg:       isDark ? 'rgba(255,255,255,0.05)'                              : 'rgba(0,0,0,0.05)',
    mobileBtnText:     isDark ? 'rgba(255,255,255,0.80)'                              : '#374151',
    // Desktop header
    desktopHdrBgFrom:  isDark ? '#932222'                                             : '#fef2f2',
    desktopHdrBgVia:   isDark ? '#411010'                                             : '#fee2e2',
    desktopHdrBgTo:    isDark ? '#a20c0c'                                             : '#fecaca',
    desktopHdrBorder:  isDark ? 'rgba(255,255,255,0.05)'                              : 'rgba(0,0,0,0.06)',
    desktopHdrTitle:   isDark ? '#ffffff'                                             : '#7f1d1d',
    desktopHdrSub:     isDark ? 'rgba(255,255,255,0.80)'                              : '#991b1b',
    desktopIconBg:     isDark ? 'rgba(255,255,255,0.10)'                              : 'rgba(0,0,0,0.08)',
    desktopIconBorder: isDark ? 'rgba(255,255,255,0.20)'                              : 'rgba(0,0,0,0.12)',
    badgeBg:           isDark ? 'rgba(0,0,0,0.30)'                                   : 'rgba(255,255,255,0.60)',
    badgeBorder:       isDark ? 'rgba(255,255,255,0.15)'                              : 'rgba(127,29,29,0.20)',
    badgeText:         isDark ? 'rgba(255,255,255,0.70)'                              : '#7f1d1d',
    // Report cards
    reportCardBgFrom:  isDark ? '#0A0A0A'                                             : '#ffffff',
    reportCardBgTo:    isDark ? '#050505'                                             : '#f9fafb',
    reportCardBorder:  isDark ? 'rgba(255,255,255,0.10)'                              : 'rgba(0,0,0,0.08)',
    reportCardHover:   isDark ? 'rgba(255,255,255,0.20)'                              : 'rgba(0,0,0,0.14)',
    reportCardTitle:   isDark ? '#ffffff'                                             : '#111827',
    reportCardTitleHover: '#E84545',
    reportCardDesc:    isDark ? '#9ca3af'                                             : '#6b7280',
    // Features panel
    featuresBgFrom:    isDark ? '#0A0A0A'                                             : '#ffffff',
    featuresBgTo:      isDark ? '#050505'                                             : '#f9fafb',
    featuresBorder:    isDark ? 'rgba(255,255,255,0.10)'                              : 'rgba(0,0,0,0.08)',
    featuresSectionTitle: isDark ? '#ffffff'                                          : '#111827',
    featureItemBg:     isDark ? 'rgba(10,10,10,0.50)'                                 : 'rgba(0,0,0,0.03)',
    featureItemBorder: isDark ? 'rgba(255,255,255,0.05)'                              : 'rgba(0,0,0,0.06)',
    featureItemHover:  isDark ? 'rgba(255,255,255,0.10)'                              : 'rgba(0,0,0,0.08)',
    featureItemTitle:  isDark ? '#ffffff'                                             : '#111827',
    featureItemDesc:   isDark ? '#9ca3af'                                             : '#6b7280',
    // Quick stats (mobile)
    statBgFrom:        isDark ? '#0A0A0A'                                             : '#ffffff',
    statBgTo:          isDark ? '#050505'                                             : '#f9fafb',
    statBorder:        isDark ? 'rgba(255,255,255,0.10)'                              : 'rgba(0,0,0,0.08)',
    statTitle:         isDark ? '#ffffff'                                             : '#111827',
    statLabel:         isDark ? '#9ca3af'                                             : '#6b7280',
    statSub:           isDark ? '#6b7280'                                             : '#9ca3af',
    // Help section
    helpBgFrom:        isDark ? 'rgba(232,69,69,0.10)'                                : '#fff5f5',
    helpBgVia:         isDark ? '#0A0A0A'                                             : '#ffffff',
    helpBgTo:          isDark ? '#050505'                                             : '#f9fafb',
    helpBorder:        isDark ? 'rgba(232,69,69,0.20)'                                : 'rgba(232,69,69,0.20)',
    helpTitle:         isDark ? '#ffffff'                                             : '#111827',
    helpDesc:          isDark ? '#9ca3af'                                             : '#6b7280',
    helpTagBg:         isDark ? '#0A0A0A'                                             : 'rgba(0,0,0,0.04)',
    helpTagBorder:     isDark ? 'rgba(255,255,255,0.10)'                              : 'rgba(0,0,0,0.08)',
    helpTagText:       isDark ? '#d1d5db'                                             : '#374151',
  };

  useEffect(() => {
    fetchUser();
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) setUser((await res.json()).user);
    } catch {}
  };

  const handleLogout = async () => { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); window.location.href = '/autocityPro/login'; };

  const reports = [
    { id:'profit-loss',      name:'Profit & Loss',     shortName:'P&L',        description:'Income statement with revenue and expenses',          icon:TrendingUp,  gradient:'from-green-500 to-emerald-600',  path:'/autocityPro/reports/profit-loss'      },
    { id:'balance-sheet',    name:'Balance Sheet',     shortName:'Balance',     description:'Assets, liabilities, and equity statement',           icon:Scale,       gradient:'from-blue-500 to-cyan-600',      path:'/autocityPro/reports/balance-sheet'    },
    { id:'sales',            name:'Sales Report',      shortName:'Sales',       description:'Detailed sales analysis by product and customer',     icon:DollarSign,  gradient:'from-purple-500 to-pink-600',    path:'/autocityPro/reports/sales'            },
    { id:'purchases',        name:'Purchase Report',   shortName:'Purchases',   description:'Purchase analysis by supplier and category',          icon:ShoppingCart,gradient:'from-orange-500 to-red-600',    path:'/autocityPro/reports/purchases'        },
    { id:'stock',            name:'Stock Report',      shortName:'Stock',       description:'Inventory valuation and stock alerts',                icon:Package,     gradient:'from-indigo-500 to-purple-600',  path:'/autocityPro/reports/stock'            },
    { id:'customer-ledger',  name:'Customer Ledger',   shortName:'Customers',   description:'Customer account statements and balances',            icon:Users,       gradient:'from-pink-500 to-rose-600',      path:'/autocityPro/reports/customer-ledger'  },
    { id:'daybook',          name:'Daybook',           shortName:'Daybook',     description:'Daily transaction summary',                           icon:Calendar,    gradient:'from-teal-500 to-green-600',     path:'/autocityPro/reports/daybook'          },
    { id:'cashflow',         name:'Cash Flow',         shortName:'Cash Flow',   description:'Operating, investing, and financing activities',      icon:Activity,    gradient:'from-red-500 to-orange-600',     path:'/autocityPro/reports/cashflow'         },
  ];

  const features = [
    { title:'Date Range Filtering', description:'Filter reports by custom date ranges', icon:Calendar,  gradient:'from-purple-500 to-pink-600'  },
    { title:'Export Options',        description:'Download as PDF or Excel',             icon:Download,  gradient:'from-blue-500 to-cyan-600'    },
    { title:'Real-time Data',        description:'Live updates from your transactions',  icon:Zap,       gradient:'from-green-500 to-emerald-600' },
  ];

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* Dynamic Island */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="rounded-[28px] px-6 py-3 shadow-2xl backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500"
              style={{ background: th.islandBg, border: `1px solid ${th.islandBorder}` }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-3 w-3 text-[#E84545]" />
                  <span className="text-xs font-semibold" style={{ color: th.islandText }}>{reports.length}</span>
                </div>
                <div className="h-3 w-px" style={{ background: th.islandDivider }} />
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3 w-3 text-blue-400" />
                  <span className="text-xs font-medium" style={{ color: th.islandText }}>Reports</span>
                </div>
                <div className="h-3 w-px" style={{ background: th.islandDivider }} />
                {isDark ? <Moon className="h-3 w-3 text-[#E84545]" /> : <Sun className="h-3 w-3 text-[#E84545]" />}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 backdrop-blur-xl transition-colors duration-500"
          style={{ background: th.mobileHdrBg, borderBottom: `1px solid ${th.mobileHdrBorder}` }}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold" style={{ color: th.mobileHdrTitle }}>Reports</h1>
                  </div>
                  <p className="text-xs" style={{ color: th.mobileHdrSub }}>Financial insights</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 border-b shadow-xl transition-colors duration-500"
          style={{ background: `linear-gradient(135deg,${th.desktopHdrBgFrom},${th.desktopHdrBgVia},${th.desktopHdrBgTo})`, borderColor: th.desktopHdrBorder }}>
          <div className="px-8">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl backdrop-blur-sm" style={{ background: th.desktopIconBg, border: `1px solid ${th.desktopIconBorder}` }}>
                <BarChart3 className="h-8 w-8" style={{ color: th.desktopHdrTitle }} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold" style={{ color: th.desktopHdrTitle }}>Financial Reports</h1>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ background: th.badgeBg, border: `1px solid ${th.badgeBorder}`, color: th.badgeText }}>
                    {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                  </div>
                </div>
                <p className="mt-1" style={{ color: th.desktopHdrSub }}>Comprehensive business insights and analytics</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[120px] md:pt-6 pb-6">

          {/* Reports Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
            {reports.map(report => (
              <button key={report.id} onClick={() => router.push(report.path)}
                className="group rounded-2xl p-4 md:p-6 transition-all duration-300 text-left active:scale-[0.98]"
                style={{ background: `linear-gradient(135deg,${th.reportCardBgFrom},${th.reportCardBgTo})`, border: `1px solid ${th.reportCardBorder}` }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = th.reportCardHover)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = th.reportCardBorder)}>
                <div className="flex flex-col gap-3 md:gap-4">
                  <div className={`p-2.5 md:p-3 bg-gradient-to-r ${report.gradient} rounded-xl w-fit shadow-lg`}>
                    <report.icon className="h-4 w-4 md:h-6 md:w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-lg font-bold mb-1 md:mb-2 transition-colors group-hover:text-[#E84545]"
                      style={{ color: th.reportCardTitle }}>
                      <span className="md:hidden">{report.shortName}</span>
                      <span className="hidden md:inline">{report.name}</span>
                    </h3>
                    <p className="text-[10px] md:text-sm line-clamp-2" style={{ color: th.reportCardDesc }}>{report.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Features Panel */}
          <div className="rounded-2xl shadow-xl p-4 md:p-6 transition-colors duration-500"
            style={{ background: `linear-gradient(135deg,${th.featuresBgFrom},${th.featuresBgTo})`, border: `1px solid ${th.featuresBorder}` }}>
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <Zap className="h-5 w-5 md:h-6 md:w-6 text-[#E84545]" />
              <h2 className="text-lg md:text-xl font-bold" style={{ color: th.featuresSectionTitle }}>Report Features</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-3 p-4 rounded-xl transition-all group"
                  style={{ background: th.featureItemBg, border: `1px solid ${th.featureItemBorder}` }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = th.featureItemHover)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = th.featureItemBorder)}>
                  <div className={`p-2 md:p-2.5 bg-gradient-to-r ${f.gradient} rounded-lg flex-shrink-0 shadow-md`}>
                    <f.icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm md:text-base font-semibold mb-1 group-hover:text-[#E84545] transition-colors"
                      style={{ color: th.featureItemTitle }}>{f.title}</h3>
                    <p className="text-xs md:text-sm" style={{ color: th.featureItemDesc }}>{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats (mobile) */}
          {isMobile && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                { icon:<FileText className="h-4 w-4 text-blue-400" />, label:'Available', value:reports.length.toString(), sub:'Reports' },
                { icon:<TrendingUp className="h-4 w-4 text-green-400" />, label:'Real-time', value:'Live', sub:'Data' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-4 transition-colors duration-500"
                  style={{ background: `linear-gradient(135deg,${th.statBgFrom},${th.statBgTo})`, border: `1px solid ${th.statBorder}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    {s.icon}
                    <span className="text-xs" style={{ color: th.statLabel }}>{s.label}</span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: th.statTitle }}>{s.value}</p>
                  <p className="text-xs mt-1" style={{ color: th.statSub }}>{s.sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* Help Section */}
          <div className="mt-6 md:mt-8 rounded-2xl p-4 md:p-6 transition-colors duration-500"
            style={{ background: `linear-gradient(135deg,${th.helpBgFrom},${th.helpBgVia},${th.helpBgTo})`, border: `1px solid ${th.helpBorder}` }}>
            <div className="flex items-start gap-3 md:gap-4">
              <div className="p-2 md:p-3 bg-[#E84545]/10 rounded-xl flex-shrink-0">
                <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-[#E84545]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm md:text-lg font-bold mb-1 md:mb-2" style={{ color: th.helpTitle }}>Need Help?</h3>
                <p className="text-xs md:text-sm mb-3 md:mb-4" style={{ color: th.helpDesc }}>
                  All reports can be filtered by date range and exported to PDF or Excel format. Click on any report to view detailed analytics.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { icon:<Calendar className="h-3 w-3" />, label:'Date Filters' },
                    { icon:<Download className="h-3 w-3" />, label:'Export'       },
                    { icon:<Zap className="h-3 w-3" />,      label:'Real-time'    },
                  ].map(tag => (
                    <span key={tag.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors duration-500"
                      style={{ background: th.helpTagBg, border: `1px solid ${th.helpTagBorder}`, color: th.helpTagText }}>
                      {tag.icon}{tag.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="md:hidden h-24" />
    </MainLayout>
  );
}