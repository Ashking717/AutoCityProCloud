'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Download, 
  Printer, 
  Activity, 
  Loader2, 
  ChevronLeft, 
  TrendingUp, 
  TrendingDown,
  MoreVertical,
  X,
  DollarSign,
  Droplet
} from 'lucide-react';
import toast from 'react-hot-toast';

// Types for the API response
interface CashFlowSection {
  items: { [key: string]: number };
  total: number;
}

interface CashFlowData {
  operatingActivities: CashFlowSection;
  investingActivities: CashFlowSection;
  financingActivities: CashFlowSection;
  netCashFlow: number;
  openingCash: number;
  closingCash: number;
  metadata: {
    outletName: string;
    outletId: string;
    generatedAt: string;
    fromDate: string;
    toDate: string;
  };
}

export default function CashFlowPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
  });
  const [reportData, setReportData] = useState<CashFlowData | null>(null);
  
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
  
  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        fromDate: dateRange.fromDate, 
        toDate: dateRange.toDate 
      });
      const res = await fetch(`/api/reports/cashflow?${params}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('Cash Flow Data:', data);
        setReportData(data);
        toast.success('Cash flow statement generated successfully');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to generate cash flow report');
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };
  
  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!reportData) {
      toast.error('No data to export');
      return;
    }
    
    toast.success('Export feature coming soon!');
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-QA', {
      style: 'currency',
      currency: 'QAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) return `QR${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 10000) return `QR${(amount / 1000).toFixed(1)}K`;
    return `QR${amount.toFixed(0)}`;
  };
  
  const renderCashFlowItems = (items: { [key: string]: number }) => {
    if (!items || Object.keys(items).length === 0) {
      return (
        <div className="text-center py-4">
          <p className="text-white/40 text-xs md:text-sm">No activities in this period</p>
        </div>
      );
    }

    return Object.entries(items).map(([name, value]) => (
      <div key={name} className="flex justify-between items-center hover:bg-white/5 px-3 py-2.5 rounded transition-colors">
        <span className="text-white/80 text-xs md:text-sm truncate pr-2">{name}</span>
        <span className={`font-semibold text-xs md:text-sm flex-shrink-0 ${value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {value >= 0 ? '+' : ''}{isMobile ? formatCompactCurrency(value) : formatCurrency(value)}
        </span>
      </div>
    ));
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };
  
  if (loading && !reportData) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center min-h-screen bg-[#050505]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[#E84545] mx-auto mb-4" />
            <p className="text-white">Generating cash flow statement...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && reportData && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                {reportData.netCashFlow >= 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-green-400 text-xs font-semibold">
                      {formatCompactCurrency(reportData.netCashFlow)}
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-500" />
                    <span className="text-red-400 text-xs font-semibold">
                      {formatCompactCurrency(Math.abs(reportData.netCashFlow))}
                    </span>
                  </>
                )}
                <div className="h-3 w-px bg-white/20"></div>
                <Droplet className="h-3 w-3 text-[#E84545]" />
                <span className="text-white text-xs">Cash Flow</span>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">Cash Flow</h1>
                  <p className="text-xs text-white/60">Statement</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileMenu(true)}
                className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                type="date"
                value={dateRange.fromDate}
                onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })}
                className="px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white text-xs focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
              />
              <input
                type="date"
                value={dateRange.toDate}
                onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })}
                className="px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white text-xs focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
              />
            </div>

            <button
              onClick={fetchReport}
              disabled={loading}
              className="w-full px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-medium disabled:opacity-50 text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              <span>Generate</span>
            </button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-4 md:py-7 bg-gradient-to-r from-red-900 via-[#541515] to-[#4d0b0b] border border-[#E84545]/30 shadow-lg overflow-hidden relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSIjRjg0NTQ1IiBmaWxsLW9wYWNpdHk9IjAuMSIgZmlsbC1ydWxlPSJldmVub2RkIj48Y2lyY2xlIGN4PSIzIiBjeT0iMyIgcj0iMyIvPjxjaXJjbGUgY3g9IjEzIiBjeT0iMTMiIHI9IjMiLz48L2c+PC9zdmc+')] opacity-20"></div>
          
          <div className="max-w-7xl mx-auto px-8 relative z-10">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-white/90 hover:text-white transition-colors mb-4"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
                  <Activity className="w-8 h-8" />
                  <span>Cash Flow Statement</span>
                </h1>
                <p className="text-white/90 mt-1">Operating, investing, and financing activities</p>
              </div>
              
              {reportData && (
                <div className="text-right">
                  <p className="text-sm text-white/80">Net Cash Flow</p>
                  <p className={`text-2xl font-bold ${reportData.netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {reportData.netCashFlow >= 0 ? '+' : ''}{formatCurrency(reportData.netCashFlow)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters Panel - Desktop Only */}
        <div className="hidden md:block max-w-7xl mx-auto px-8 py-6">
          <div className="bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateRange.fromDate}
                  onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })}
                  className="w-full px-4 py-3 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-[#E84545] outline-none transition-all text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  value={dateRange.toDate}
                  onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })}
                  className="w-full px-4 py-3 bg-[#111111] border border-white/5 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-[#E84545] outline-none transition-all text-white"
                />
              </div>
              
              <div>
                <button
                  onClick={fetchReport}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] hover:opacity-90 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-5 h-5" />
                      <span>Generate Report</span>
                    </>
                  )}
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={!reportData || loading}
                  className="flex-1 px-4 py-2.5 bg-[#111111] border border-white/5 rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm transition-all duration-200"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span className="text-white">PDF</span>
                </button>
                
                <button
                  onClick={() => window.print()}
                  disabled={!reportData || loading}
                  className="px-4 py-2.5 bg-[#111111] border border-white/5 rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm transition-all duration-200"
                >
                  <Printer className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-[220px] md:pt-0 pb-6">
          {!reportData ? (
            <div className="bg-[#0A0A0A] rounded-xl shadow-lg border border-white/5 p-8 md:p-12 text-center">
              <Activity className="w-12 h-12 md:w-16 md:h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-base md:text-xl font-semibold text-white mb-2">
                No Cash Flow Data
              </h3>
              <p className="text-sm text-white/60 mb-6">
                Generate a cash flow statement to view your cash movements.
              </p>
              <button
                onClick={fetchReport}
                className="px-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] hover:opacity-90 text-white rounded-lg font-medium inline-flex items-center space-x-2 active:scale-95 transition-all"
              >
                <Activity className="w-5 h-5" />
                <span>Generate Report</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 border border-blue-700/50 rounded-xl p-3 md:p-4 active:scale-[0.98] transition-all">
                  <p className="text-blue-300 text-xs md:text-sm font-medium mb-1">Opening Cash</p>
                  <p className="text-lg md:text-2xl font-bold text-white truncate">
                    {isMobile ? formatCompactCurrency(reportData.openingCash) : formatCurrency(reportData.openingCash)}
                  </p>
                </div>
                
                <div className={`bg-gradient-to-br ${reportData.operatingActivities.total >= 0 ? 'from-green-900/30 to-green-800/30 border-green-700/50' : 'from-red-900/30 to-red-800/30 border-red-700/50'} border rounded-xl p-3 md:p-4 active:scale-[0.98] transition-all`}>
                  <p className={`${reportData.operatingActivities.total >= 0 ? 'text-green-300' : 'text-red-300'} text-xs md:text-sm font-medium mb-1 truncate`}>
                    Operating
                  </p>
                  <p className={`text-lg md:text-2xl font-bold truncate ${reportData.operatingActivities.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {reportData.operatingActivities.total >= 0 ? '+' : ''}
                    {isMobile ? formatCompactCurrency(reportData.operatingActivities.total) : formatCurrency(reportData.operatingActivities.total)}
                  </p>
                </div>
                
                <div className={`bg-gradient-to-br ${reportData.investingActivities.total >= 0 ? 'from-[#E84545]/20 to-[#cc3c3c]/20 border-[#E84545]/50' : 'from-orange-900/30 to-orange-800/30 border-orange-700/50'} border rounded-xl p-3 md:p-4 active:scale-[0.98] transition-all`}>
                  <p className={`${reportData.investingActivities.total >= 0 ? 'text-[#E84545]' : 'text-orange-300'} text-xs md:text-sm font-medium mb-1 truncate`}>
                    Investing
                  </p>
                  <p className={`text-lg md:text-2xl font-bold truncate ${reportData.investingActivities.total >= 0 ? 'text-[#E84545]' : 'text-orange-400'}`}>
                    {reportData.investingActivities.total >= 0 ? '+' : ''}
                    {isMobile ? formatCompactCurrency(reportData.investingActivities.total) : formatCurrency(reportData.investingActivities.total)}
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-[#E84545]/20 to-[#cc3c3c]/20 border border-[#E84545]/50 rounded-xl p-3 md:p-4 active:scale-[0.98] transition-all">
                  <p className="text-[#E84545] text-xs md:text-sm font-medium mb-1">Closing Cash</p>
                  <p className="text-lg md:text-2xl font-bold text-white truncate">
                    {isMobile ? formatCompactCurrency(reportData.closingCash) : formatCurrency(reportData.closingCash)}
                  </p>
                </div>
              </div>

              {/* Main Report */}
              <div className="bg-[#0A0A0A] rounded-2xl shadow-lg border border-white/5 overflow-hidden">
                {/* Header */}
                <div className="px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-[#E84545] to-[#cc3c3c]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base md:text-xl font-bold text-white">{user?.outletName || 'AutoCity'}</h2>
                      <p className="text-xs md:text-sm text-white/90 mt-1">
                        {new Date(dateRange.fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(dateRange.toDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                  {/* Operating Activities */}
                  <div className="bg-[#111111] rounded-xl border border-white/5 overflow-hidden active:scale-[0.98] transition-all">
                    <div className={`px-4 md:px-5 py-3 md:py-4 ${reportData.operatingActivities.total >= 0 ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm md:text-lg font-bold text-white flex items-center">
                          <span className={`h-2 w-2 md:h-3 md:w-3 ${reportData.operatingActivities.total >= 0 ? 'bg-green-500' : 'bg-red-500'} rounded-full mr-2`}></span>
                          <span className="hidden md:inline">CASH FLOWS FROM OPERATING ACTIVITIES</span>
                          <span className="md:hidden">OPERATING</span>
                        </h3>
                        <span className={`font-bold text-sm md:text-xl ${reportData.operatingActivities.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {reportData.operatingActivities.total >= 0 ? '+' : ''}
                          {isMobile ? formatCompactCurrency(reportData.operatingActivities.total) : formatCurrency(reportData.operatingActivities.total)}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 md:p-4">
                      {renderCashFlowItems(reportData.operatingActivities.items)}
                    </div>
                  </div>
                  
                  {/* Investing Activities */}
                  <div className="bg-[#111111] rounded-xl border border-white/5 overflow-hidden active:scale-[0.98] transition-all">
                    <div className={`px-4 md:px-5 py-3 md:py-4 ${reportData.investingActivities.total >= 0 ? 'bg-[#E84545]/20' : 'bg-orange-900/20'}`}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm md:text-lg font-bold text-white flex items-center">
                          <span className={`h-2 w-2 md:h-3 md:w-3 ${reportData.investingActivities.total >= 0 ? 'bg-[#E84545]' : 'bg-orange-500'} rounded-full mr-2`}></span>
                          <span className="hidden md:inline">CASH FLOWS FROM INVESTING ACTIVITIES</span>
                          <span className="md:hidden">INVESTING</span>
                        </h3>
                        <span className={`font-bold text-sm md:text-xl ${reportData.investingActivities.total >= 0 ? 'text-[#E84545]' : 'text-orange-400'}`}>
                          {reportData.investingActivities.total >= 0 ? '+' : ''}
                          {isMobile ? formatCompactCurrency(reportData.investingActivities.total) : formatCurrency(reportData.investingActivities.total)}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 md:p-4">
                      {renderCashFlowItems(reportData.investingActivities.items)}
                    </div>
                  </div>
                  
                  {/* Financing Activities */}
                  <div className="bg-[#111111] rounded-xl border border-white/5 overflow-hidden active:scale-[0.98] transition-all">
                    <div className={`px-4 md:px-5 py-3 md:py-4 ${reportData.financingActivities.total >= 0 ? 'bg-blue-900/20' : 'bg-pink-900/20'}`}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm md:text-lg font-bold text-white flex items-center">
                          <span className={`h-2 w-2 md:h-3 md:w-3 ${reportData.financingActivities.total >= 0 ? 'bg-blue-500' : 'bg-pink-500'} rounded-full mr-2`}></span>
                          <span className="hidden md:inline">CASH FLOWS FROM FINANCING ACTIVITIES</span>
                          <span className="md:hidden">FINANCING</span>
                        </h3>
                        <span className={`font-bold text-sm md:text-xl ${reportData.financingActivities.total >= 0 ? 'text-blue-400' : 'text-pink-400'}`}>
                          {reportData.financingActivities.total >= 0 ? '+' : ''}
                          {isMobile ? formatCompactCurrency(reportData.financingActivities.total) : formatCurrency(reportData.financingActivities.total)}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 md:p-4">
                      {renderCashFlowItems(reportData.financingActivities.items)}
                    </div>
                  </div>
                  
                  {/* Net Cash Flow */}
                  <div className={`${reportData.netCashFlow >= 0 ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-700' : 'bg-gradient-to-r from-red-900/30 to-pink-900/30 border-red-700'} p-4 md:p-6 rounded-xl border-2 active:scale-[0.98] transition-all`}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-base md:text-xl font-bold text-white flex items-center">
                        {reportData.netCashFlow >= 0 ? (
                          <TrendingUp className="w-4 h-4 md:w-6 md:h-6 mr-2 text-green-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 md:w-6 md:h-6 mr-2 text-red-400" />
                        )}
                        <span className="hidden md:inline">NET CHANGE IN CASH</span>
                        <span className="md:hidden">NET CHANGE</span>
                      </h3>
                      <span className={`text-xl md:text-3xl font-bold ${reportData.netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {reportData.netCashFlow >= 0 ? '+' : ''}
                        {isMobile ? formatCompactCurrency(reportData.netCashFlow) : formatCurrency(reportData.netCashFlow)}
                      </span>
                    </div>
                    <div className={`h-2 rounded-full ${reportData.netCashFlow >= 0 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-pink-500'}`}></div>
                  </div>
                  
                  {/* Cash Reconciliation */}
                  <div className="bg-gradient-to-r from-[#E84545]/10 to-[#cc3c3c]/10 p-4 md:p-6 rounded-xl border-2 border-[#E84545]/50 active:scale-[0.98] transition-all">
                    <h3 className="text-base md:text-xl font-bold text-[#E84545] mb-4 flex items-center">
                      <Activity className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                      CASH RECONCILIATION
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white/80 text-sm md:text-lg">Opening Cash Balance</span>
                        <span className="font-semibold text-white text-sm md:text-lg">
                          {isMobile ? formatCompactCurrency(reportData.openingCash) : formatCurrency(reportData.openingCash)}
                        </span>
                      </div>
                      <div className="h-px bg-[#E84545]/30"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/80 text-sm md:text-lg">Net Change in Cash</span>
                        <span className={`font-semibold text-sm md:text-lg ${reportData.netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {reportData.netCashFlow >= 0 ? '+' : ''}
                          {isMobile ? formatCompactCurrency(reportData.netCashFlow) : formatCurrency(reportData.netCashFlow)}
                        </span>
                      </div>
                      <div className="h-px bg-[#E84545]/50"></div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-base md:text-xl font-bold text-[#E84545]">Closing Cash Balance</span>
                        <span className="text-xl md:text-2xl font-bold text-[#E84545]">
                          {isMobile ? formatCompactCurrency(reportData.closingCash) : formatCurrency(reportData.closingCash)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Footer */}
                <div className="px-4 md:px-6 py-3 md:py-4 bg-[#111111] border-t border-white/5 text-center">
                  <p className="text-xs md:text-sm text-white/40">
                    Generated: {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-24"></div>
      </div>

      {/* Mobile Action Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-[60] animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#0A0A0A] to-[#050505] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Actions</h2>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  handleExport('pdf');
                  setShowMobileMenu(false);
                }}
                disabled={!reportData}
                className="w-full p-4 bg-[#0A0A0A]/50 border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between disabled:opacity-50 active:scale-[0.98]"
              >
                <span>Export PDF</span>
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  window.print();
                  setShowMobileMenu(false);
                }}
                disabled={!reportData}
                className="w-full p-4 bg-[#0A0A0A]/50 border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between disabled:opacity-50 active:scale-[0.98]"
              >
                <span>Print Report</span>
                <Printer className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}