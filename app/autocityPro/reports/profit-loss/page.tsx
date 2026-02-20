'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Download, 
  Printer, 
  TrendingUp, 
  Loader2, 
  ChevronLeft,
  MoreVertical,
  X,
  TrendingDown,
  DollarSign,
  Zap,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// Types for the API response
interface ProfitLossCategory {
  items: { [key: string]: number };
  total: number;
}

interface ProfitLossData {
  revenue: ProfitLossCategory;
  costOfSales: ProfitLossCategory;
  expenses: ProfitLossCategory;
  otherIncome: ProfitLossCategory;
  otherExpenses: ProfitLossCategory;
  grossProfit: number;
  operatingProfit: number;
  netProfit: number;
  metadata: {
    outletName: string;
    outletId: string;
    generatedAt: string;
    fromDate: string;
    toDate: string;
  };
}

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
  return formatCurrency(amount);
};

function CategoryItems({ items, isExpense, isMobile }: { items: { [key: string]: number }; isExpense: boolean; isMobile: boolean }) {
  return (
    <>
      {Object.entries(items).map(([name, value]) => (
        <div key={name} className="flex justify-between hover:bg-slate-700/50 p-2 rounded transition-colors">
          <span className="text-slate-300 capitalize text-xs md:text-sm truncate pr-2">
            {name.replace(/([A-Z])/g, ' $1').trim()}
          </span>
          <span className={`font-semibold text-xs md:text-sm flex-shrink-0 ${isExpense ? 'text-red-400' : 'text-green-400'}`}>
            {isMobile ? formatCompactCurrency(isExpense ? -Math.abs(value) : Math.abs(value)) : formatCurrency(isExpense ? -Math.abs(value) : Math.abs(value))}
          </span>
        </div>
      ))}
    </>
  );
}

export default function ProfitLossPage() {
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
  const [reportData, setReportData] = useState<ProfitLossData | null>(null);
  
  useEffect(() => {
    fetchUser();
    fetchReport();

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
      const res = await fetch(`/api/reports/profit-loss?${params}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setReportData(data.reportData);
      } else {
        toast.error('Failed to generate profit & loss report');
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
    
    try {
      if (format === 'excel') {
        toast.loading('Generating Excel file...');
        
        const params = new URLSearchParams({ 
          fromDate: dateRange.fromDate,
          toDate: dateRange.toDate,
          format: 'excel'
        });
        
        const res = await fetch(`/api/reports/profit-loss/export?${params}`, {
          credentials: 'include',
        });
        
        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `profit-loss-${dateRange.fromDate}-to-${dateRange.toDate}.xlsx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          toast.dismiss();
          toast.success('Excel file downloaded');
        } else {
          const error = await res.json();
          toast.dismiss();
          toast.error(error.error || 'Export failed');
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.dismiss();
      toast.error('Export failed. Please try again.');
    }
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  const calculateMargin = (profit: number, revenue: number) => {
    if (!revenue) return '0.00';
    return ((profit / revenue) * 100).toFixed(2);
  };
  
  if (loading && !reportData) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-screen bg-[#050505]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#E84545] mx-auto mb-4" />
            <span className="text-slate-300">Generating profit & loss statement...</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  const grossProfitMargin = calculateMargin(reportData?.grossProfit || 0, reportData?.revenue.total || 0);
  const operatingProfitMargin = calculateMargin(reportData?.operatingProfit || 0, reportData?.revenue.total || 0);
  const netProfitMargin = calculateMargin(reportData?.netProfit || 0, reportData?.revenue.total || 0);

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && reportData && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                {reportData.netProfit >= 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-white text-xs font-semibold">Profit</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-500" />
                    <span className="text-white text-xs font-semibold">Loss</span>
                  </>
                )}
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-[#E84545]" />
                  <span className={`text-xs font-medium ${reportData.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCompactCurrency(Math.abs(reportData.netProfit))}
                  </span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <span className="text-white text-xs">{netProfitMargin}%</span>
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
                  <h1 className="text-xl font-bold text-white">P&L Statement</h1>
                  <p className="text-xs text-white/60">Income statement</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileMenu(true)}
                className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
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
              className="w-full mt-2 px-4 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-medium disabled:opacity-50 text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
              <span>Generate</span>
            </button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-4 md:py-12 bg-gradient-to-r from-red-900 via-[#541515] to-[#4d0b0b] border border-[#E84545]/30 shadow-lg overflow-hidden relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSIjRjg0NTQ1IiBmaWxsLW9wYWNpdHk9IjAuMSIgZmlsbC1ydWxlPSJldmVub2RkIj48Y2lyY2xlIGN4PSIzIiBjeT0iMyIgcj0iMyIvPjxjaXJjbGUgY3g9IjEzIiBjeT0iMTMiIHI9IjMiLz48L2c+PC9zdmc+')] opacity-20"></div>
          
          <div className="px-8 py-2 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="flex items-center space-x-2 text-white/90 hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span>Back</span>
                </button>
                <div className="h-8 w-0.5 bg-white/30"></div>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Profit & Loss Statement</h1>
                    <p className="text-white/90 text-sm">Real-time income statement</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-white/80 text-sm">Period</p>
                  <p className="text-white font-semibold">
                    {new Date(dateRange.fromDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })} - {new Date(dateRange.toDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel - Desktop Only */}
        <div className="hidden md:block px-8 py-6">
          <div className="bg-black/30 rounded-xl shadow-lg border border-slate-700 p-6 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
              <div className="lg:col-span-3">
                <label htmlFor="pl-from-date" className="block text-sm font-medium text-slate-300 mb-2">
                  <span className="flex items-center">
                    <span className="h-2 w-2 bg-green-400 rounded-full mr-2"></span>
                    From Date
                  </span>
                </label>
                <input
                  id="pl-from-date"
                  type="date"
                  value={dateRange.fromDate}
                  onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-[#E84545] outline-none transition-all text-slate-100"
                />
              </div>
              
              <div className="lg:col-span-3">
                <label htmlFor="pl-to-date" className="block text-sm font-medium text-slate-300 mb-2">
                  <span className="flex items-center">
                    <span className="h-2 w-2 bg-green-400 rounded-full mr-2"></span>
                    To Date
                  </span>
                </label>
                <input
                  id="pl-to-date"
                  type="date"
                  value={dateRange.toDate}
                  onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-[#E84545] outline-none transition-all text-slate-100"
                />
              </div>
              
              <div className="lg:col-span-3">
                <button
                  onClick={fetchReport}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-gradient-to-r from-[#8a2424] to-[#7f1a1a] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-md transition-all duration-200 font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4" />
                      <span>Generate Report</span>
                    </>
                  )}
                </button>
              </div>
              
              <div className="lg:col-span-3">
                <div className="flex items-center justify-end space-x-3">
                  <span className="text-sm font-medium text-slate-300">Export:</span>
                  <button
                    onClick={() => handleExport('excel')}
                    disabled={!reportData || loading}
                    className="px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-sm transition-all duration-200"
                  >
                    <Download className="h-4 w-4 text-green-400" />
                    <span className="text-slate-200">Excel</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    disabled={!reportData || loading}
                    className="px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm transition-all duration-200"
                  >
                    <Printer className="h-4 w-4 text-slate-300" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="p-4 md:px-8 pt-[220px] md:pt-0 pb-6">
          {!reportData ? (
            <div className="bg-black/30 rounded-xl shadow-lg border border-slate-700 p-8 md:p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-slate-700 rounded-full w-12 h-12 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-slate-400" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-slate-200 mb-2">No Profit & Loss Data</h3>
                <p className="text-sm text-slate-400 mb-6">
                  Generate a profit & loss statement to view your financial performance.
                </p>
                <button
                  onClick={fetchReport}
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-2 font-medium active:scale-95 transition-all"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Generate Report</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-black/30 rounded-2xl shadow-lg border border-slate-700 overflow-hidden">
              {/* Header */}
              <div className="px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-[#701f1f] to-[#a31717]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base md:text-xl font-bold text-white">{user?.outletName || 'AutoCity'}</h2>
                    <p className="text-xs md:text-sm text-white/90 mt-1">
                      {new Date(dateRange.fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(dateRange.toDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="px-2 md:px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
                    <span className="text-xs md:text-sm font-semibold text-white">
                      {isMobile ? formatCompactCurrency(reportData.netProfit) : formatCurrency(reportData.netProfit)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-8 md:p-6 space-y-4 md:space-y-8">
                {/* Revenue Section */}
                <div className="bg-black/30 rounded-xl p-4 md:p-5 border border-slate-600 active:scale-[0.98] transition-all">
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <h3 className="text-sm md:text-lg font-bold text-slate-200 flex items-center">
                      <span className="h-2 w-2 md:h-3 md:w-3 bg-green-600 rounded-full mr-2"></span>
                      REVENUE
                    </h3>
                    <span className="font-bold text-green-600 text-sm md:text-lg">
                      {isMobile ? formatCompactCurrency(reportData.revenue.total) : formatCurrency(reportData.revenue.total)}
                    </span>
                  </div>
                  <div className="space-y-1 md:space-y-2 pl-3 md:pl-5">
                    {Object.keys(reportData.revenue.items).length > 0 ? (
                      <CategoryItems items={reportData.revenue.items} isExpense={false} isMobile={isMobile} />
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-slate-400 text-xs md:text-sm">No revenue items found</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Cost of Sales Section */}
                <div className="bg-slate-700/30 rounded-xl p-4 md:p-5 border border-slate-600 active:scale-[0.98] transition-all">
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <h3 className="text-sm md:text-lg font-bold text-slate-200 flex items-center">
                      <span className="h-2 w-2 md:h-3 md:w-3 bg-red-700 rounded-full mr-2"></span>
                      COST OF SALES
                    </h3>
                    <span className="font-bold text-red-700 text-sm md:text-lg">
                      {isMobile ? formatCompactCurrency(-reportData.costOfSales.total) : formatCurrency(-reportData.costOfSales.total)}
                    </span>
                  </div>
                  <div className="space-y-1 md:space-y-2 pl-3 md:pl-5">
                    {Object.keys(reportData.costOfSales.items).length > 0 ? (
                      <CategoryItems items={reportData.costOfSales.items} isExpense={true} isMobile={isMobile} />
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-slate-400 text-xs md:text-sm">No cost of sales items found</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Gross Profit */}
                <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 p-4 md:p-6 rounded-xl border border-green-800/50 active:scale-[0.98] transition-all">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h3 className="text-sm md:text-lg font-bold text-green-300">GROSS PROFIT</h3>
                      <p className="text-xs md:text-sm text-green-400">Margin: {grossProfitMargin}%</p>
                    </div>
                    <span className="text-lg md:text-2xl font-bold text-green-400">
                      {isMobile ? formatCompactCurrency(reportData.grossProfit) : formatCurrency(reportData.grossProfit)}
                    </span>
                  </div>
                  <div className="mt-2 h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                </div>
                
                {/* Operating Expenses */}
                <div className="bg-slate-700/30 rounded-xl p-4 md:p-5 border border-slate-600 active:scale-[0.98] transition-all">
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <h3 className="text-sm md:text-lg font-bold text-slate-200 flex items-center">
                      <span className="h-2 w-2 md:h-3 md:w-3 bg-orange-500 rounded-full mr-2"></span>
                      OPERATING EXPENSES
                    </h3>
                    <span className="font-bold text-red-400 text-sm md:text-lg">
                      {isMobile ? formatCompactCurrency(-reportData.expenses.total) : formatCurrency(-reportData.expenses.total)}
                    </span>
                  </div>
                  <div className="space-y-1 md:space-y-2 pl-3 md:pl-5">
                    {Object.keys(reportData.expenses.items).length > 0 ? (
                      <CategoryItems items={reportData.expenses.items} isExpense={true} isMobile={isMobile} />
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-slate-400 text-xs md:text-sm">No expense items found</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Operating Profit */}
                <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 p-4 md:p-6 rounded-xl border border-blue-800/50 active:scale-[0.98] transition-all">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h3 className="text-sm md:text-lg font-bold text-blue-300">OPERATING PROFIT</h3>
                      <p className="text-xs md:text-sm text-blue-400">Margin: {operatingProfitMargin}%</p>
                    </div>
                    <span className="text-lg md:text-2xl font-bold text-blue-400">
                      {isMobile ? formatCompactCurrency(reportData.operatingProfit) : formatCurrency(reportData.operatingProfit)}
                    </span>
                  </div>
                  <div className="mt-2 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                </div>
                
                {/* Other Income */}
                {reportData.otherIncome.total > 0 && (
                  <div className="bg-slate-700/30 rounded-xl p-4 md:p-5 border border-slate-600 active:scale-[0.98] transition-all">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                      <h3 className="text-sm md:text-lg font-bold text-slate-200 flex items-center">
                        <span className="h-2 w-2 md:h-3 md:w-3 bg-teal-500 rounded-full mr-2"></span>
                        OTHER INCOME
                      </h3>
                      <span className="font-bold text-green-400 text-sm md:text-lg">
                        {isMobile ? formatCompactCurrency(reportData.otherIncome.total) : formatCurrency(reportData.otherIncome.total)}
                      </span>
                    </div>
                    <div className="space-y-1 md:space-y-2 pl-3 md:pl-5">
                      <CategoryItems items={reportData.otherIncome.items} isExpense={false} isMobile={isMobile} />
                    </div>
                  </div>
                )}
                
                {/* Other Expenses */}
                {reportData.otherExpenses.total > 0 && (
                  <div className="bg-slate-700/30 rounded-xl p-4 md:p-5 border border-slate-600 active:scale-[0.98] transition-all">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                      <h3 className="text-sm md:text-lg font-bold text-slate-200 flex items-center">
                        <span className="h-2 w-2 md:h-3 md:w-3 bg-pink-500 rounded-full mr-2"></span>
                        OTHER EXPENSES
                      </h3>
                      <span className="font-bold text-red-400 text-sm md:text-lg">
                        {isMobile ? formatCompactCurrency(-reportData.otherExpenses.total) : formatCurrency(-reportData.otherExpenses.total)}
                      </span>
                    </div>
                    <div className="space-y-1 md:space-y-2 pl-3 md:pl-5">
                      <CategoryItems items={reportData.otherExpenses.items} isExpense={true} isMobile={isMobile} />
                    </div>
                  </div>
                )}
                
                {/* Net Profit */}
                <div className={`${reportData.netProfit >= 0 ? 'bg-gradient-to-r from-[#E84545]/20 to-[#cc3c3c]/20 border-[#E84545]/50' : 'bg-gradient-to-r from-red-900/30 to-pink-900/30 border-red-800/50'} p-4 md:p-6 rounded-xl border active:scale-[0.98] transition-all`}>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h3 className="text-sm md:text-lg font-bold text-slate-200">NET PROFIT</h3>
                      <p className="text-xs md:text-sm text-slate-300">Net Profit Margin: {netProfitMargin}%</p>
                    </div>
                    <span className={`text-xl md:text-3xl font-bold ${reportData.netProfit >= 0 ? 'text-[#E84545]' : 'text-red-400'}`}>
                      {isMobile ? formatCompactCurrency(reportData.netProfit) : formatCurrency(reportData.netProfit)}
                    </span>
                  </div>
                  <div className={`mt-2 h-1 rounded-full ${reportData.netProfit >= 0 ? 'bg-gradient-to-r from-[#E84545] to-[#cc3c3c]' : 'bg-gradient-to-r from-red-500 to-pink-500'}`}></div>
                  <div className="flex items-center justify-center space-x-2 mt-4">
                    {reportData.netProfit >= 0 ? (
                      <div className="w-5 h-5 md:w-6 md:h-6 bg-green-900/50 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-green-400" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 md:w-6 md:h-6 bg-red-900/50 rounded-full flex items-center justify-center">
                        <TrendingDown className="w-3 h-3 md:w-4 md:h-4 text-red-400" />
                      </div>
                    )}
                    <p className={`text-xs md:text-sm font-medium ${reportData.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {reportData.netProfit >= 0 ? 'Profitable Period' : 'Loss Period'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="px-4 md:px-6 py-3 md:py-4 bg-slate-900/50 border-t border-slate-700 text-center">
                <p className="text-xs md:text-sm text-slate-400">
                  Generated: {new Date().toLocaleDateString()}
                </p>
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
                  handleExport('excel');
                  setShowMobileMenu(false);
                }}
                disabled={!reportData}
                className="w-full p-4 bg-[#0A0A0A]/50 border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between disabled:opacity-50 active:scale-[0.98]"
              >
                <span>Export Excel</span>
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