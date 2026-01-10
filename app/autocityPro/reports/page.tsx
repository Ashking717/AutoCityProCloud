'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import {
  TrendingUp,
  Scale,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  FileText,
  Calendar,
  Activity,
  BarChart3,
  ChevronLeft,
  Download,
  Filter,
  Clock,
  Zap,
  TrendingDown,
  AlertCircle,
} from 'lucide-react';

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  
  useEffect(() => {
    fetchUser();
    
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user');
    }
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  const reports = [
    {
      id: 'profit-loss',
      name: 'Profit & Loss',
      shortName: 'P&L',
      description: 'Income statement with revenue and expenses',
      icon: TrendingUp,
      gradient: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-500/10',
      iconColor: 'text-green-400',
      borderColor: 'border-green-500/20',
      path: '/autocityPro/reports/profit-loss',
    },
    {
      id: 'balance-sheet',
      name: 'Balance Sheet',
      shortName: 'Balance',
      description: 'Assets, liabilities, and equity statement',
      icon: Scale,
      gradient: 'from-blue-500 to-cyan-600',
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-500/20',
      path: '/autocityPro/reports/balance-sheet',
    },
    {
      id: 'sales',
      name: 'Sales Report',
      shortName: 'Sales',
      description: 'Detailed sales analysis by product and customer',
      icon: DollarSign,
      gradient: 'from-purple-500 to-pink-600',
      bgColor: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
      borderColor: 'border-purple-500/20',
      path: '/autocityPro/reports/sales',
    },
    {
      id: 'purchases',
      name: 'Purchase Report',
      shortName: 'Purchases',
      description: 'Purchase analysis by supplier and category',
      icon: ShoppingCart,
      gradient: 'from-orange-500 to-red-600',
      bgColor: 'bg-orange-500/10',
      iconColor: 'text-orange-400',
      borderColor: 'border-orange-500/20',
      path: '/autocityPro/reports/purchases',
    },
    {
      id: 'stock',
      name: 'Stock Report',
      shortName: 'Stock',
      description: 'Inventory valuation and stock alerts',
      icon: Package,
      gradient: 'from-indigo-500 to-purple-600',
      bgColor: 'bg-indigo-500/10',
      iconColor: 'text-indigo-400',
      borderColor: 'border-indigo-500/20',
      path: '/autocityPro/reports/stock',
    },
    {
      id: 'customer-ledger',
      name: 'Customer Ledger',
      shortName: 'Customers',
      description: 'Customer account statements and balances',
      icon: Users,
      gradient: 'from-pink-500 to-rose-600',
      bgColor: 'bg-pink-500/10',
      iconColor: 'text-pink-400',
      borderColor: 'border-pink-500/20',
      path: '/autocityPro/reports/customer-ledger',
    },
    {
      id: 'daybook',
      name: 'Daybook',
      shortName: 'Daybook',
      description: 'Daily transaction summary',
      icon: Calendar,
      gradient: 'from-teal-500 to-green-600',
      bgColor: 'bg-teal-500/10',
      iconColor: 'text-teal-400',
      borderColor: 'border-teal-500/20',
      path: '/autocityPro/reports/daybook',
    },
    {
      id: 'cashflow',
      name: 'Cash Flow',
      shortName: 'Cash Flow',
      description: 'Operating, investing, and financing activities',
      icon: Activity,
      gradient: 'from-red-500 to-orange-600',
      bgColor: 'bg-red-500/10',
      iconColor: 'text-red-400',
      borderColor: 'border-red-500/20',
      path: '/autocityPro/reports/cashflow',
    },
  ];

  const features = [
    {
      title: 'Date Range Filtering',
      description: 'Filter reports by custom date ranges',
      icon: Calendar,
      gradient: 'from-purple-500 to-pink-600',
    },
    {
      title: 'Export Options',
      description: 'Download as PDF or Excel',
      icon: Download,
      gradient: 'from-blue-500 to-cyan-600',
    },
    {
      title: 'Real-time Data',
      description: 'Live updates from your transactions',
      icon: Zap,
      gradient: 'from-green-500 to-emerald-600',
    },
  ];
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">{reports.length}</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3 w-3 text-blue-400" />
                  <span className="text-white text-xs font-medium">Reports</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header - Compact */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">Reports</h1>
                  <p className="text-xs text-white/60">Financial insights</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-xl">
          <div className="px-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Financial Reports</h1>
                <p className="text-white/80 mt-1">Comprehensive business insights and analytics</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[120px] md:pt-6 pb-6">
          {/* Reports Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
            {reports.map((report) => (
              <button
                key={report.id}
                onClick={() => router.push(report.path)}
                className="group bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 md:p-6 hover:border-white/20 hover:shadow-xl hover:shadow-[#E84545]/5 transition-all duration-300 text-left active:scale-[0.98]"
              >
                <div className="flex flex-col gap-3 md:gap-4">
                  <div className={`p-2.5 md:p-3 bg-gradient-to-r ${report.gradient} rounded-xl w-fit shadow-lg`}>
                    <report.icon className="h-4 w-4 md:h-6 md:w-6 text-white" />
                  </div>
                  
                  <div>
                    <h3 className="text-sm md:text-lg font-bold text-white mb-1 md:mb-2 group-hover:text-[#E84545] transition-colors">
                      <span className="md:hidden">{report.shortName}</span>
                      <span className="hidden md:inline">{report.name}</span>
                    </h3>
                    <p className="text-[10px] md:text-sm text-gray-400 line-clamp-2">
                      {report.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {/* Report Features */}
          <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] rounded-2xl shadow-xl border border-white/10 p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <Zap className="h-5 w-5 md:h-6 md:w-6 text-[#E84545]" />
              <h2 className="text-lg md:text-xl font-bold text-white">Report Features</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 bg-[#0A0A0A]/50 rounded-xl border border-white/5 hover:border-white/10 transition-all group"
                >
                  <div className={`p-2 md:p-2.5 bg-gradient-to-r ${feature.gradient} rounded-lg flex-shrink-0 shadow-md`}>
                    <feature.icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm md:text-base font-semibold text-white mb-1 group-hover:text-[#E84545] transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-400">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Access Stats - Mobile Only */}
          {isMobile && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] rounded-xl border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-gray-400">Available</span>
                </div>
                <p className="text-2xl font-bold text-white">{reports.length}</p>
                <p className="text-xs text-gray-500 mt-1">Reports</p>
              </div>
              
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] rounded-xl border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-gray-400">Real-time</span>
                </div>
                <p className="text-2xl font-bold text-white">Live</p>
                <p className="text-xs text-gray-500 mt-1">Data</p>
              </div>
            </div>
          )}

          {/* Help Section */}
          <div className="mt-6 md:mt-8 bg-gradient-to-br from-[#E84545]/10 via-[#0A0A0A] to-[#050505] rounded-2xl border border-[#E84545]/20 p-4 md:p-6">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="p-2 md:p-3 bg-[#E84545]/10 rounded-xl flex-shrink-0">
                <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-[#E84545]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm md:text-lg font-bold text-white mb-1 md:mb-2">Need Help?</h3>
                <p className="text-xs md:text-sm text-gray-400 mb-3 md:mb-4">
                  All reports can be filtered by date range and exported to PDF or Excel format. 
                  Click on any report to view detailed analytics.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0A0A0A] border border-white/10 rounded-lg text-xs text-gray-300">
                    <Calendar className="h-3 w-3" />
                    Date Filters
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0A0A0A] border border-white/10 rounded-lg text-xs text-gray-300">
                    <Download className="h-3 w-3" />
                    Export
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0A0A0A] border border-white/10 rounded-lg text-xs text-gray-300">
                    <Zap className="h-3 w-3" />
                    Real-time
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Safe Area Bottom Padding */}
      <div className="md:hidden h-6"></div>

      <style jsx global>{`
        @supports (padding: max(0px)) {
          .md\\:hidden.fixed.top-16 {
            padding-top: max(12px, env(safe-area-inset-top));
          }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </MainLayout>
  );
}