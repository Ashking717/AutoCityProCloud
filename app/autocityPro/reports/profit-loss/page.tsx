'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Download, Printer, TrendingUp, Loader2, ChevronLeft } from 'lucide-react';
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

export default function ProfitLossPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
  });
  const [reportData, setReportData] = useState<ProfitLossData | null>(null);
  
  useEffect(() => {
    fetchUser();
    fetchReport();
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
        // Server-side Excel generation
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
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-QA', {
      style: 'currency',
      currency: 'QAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };
  
  const renderCategoryItems = (items: { [key: string]: number }, isExpense: boolean = false) => {
    return Object.entries(items).map(([name, value]) => (
      <div key={name} className="flex justify-between hover:bg-slate-700/50 p-2 rounded transition-colors">
        <span className="text-slate-300 capitalize">{name.replace(/([A-Z])/g, ' $1').trim()}</span>
        <span className={`font-semibold ${isExpense ? 'text-red-400' : 'text-green-400'}`}>
          {formatCurrency(isExpense ? -Math.abs(value) : Math.abs(value))}
        </span>
      </div>
    ));
  };
  
  const calculateMargin = (profit: number, revenue: number) => {
    if (!revenue) return '0.00';
    return ((profit / revenue) * 100).toFixed(2);
  };
  
  if (loading && !reportData) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-screen bg-slate-900">
          <Loader2 className="h-8 w-8 animate-spin text-green-400" />
          <span className="ml-2 text-slate-300">Generating profit & loss statement...</span>
        </div>
      </MainLayout>
    );
  }

  const grossProfitMargin = calculateMargin(reportData?.grossProfit || 0, reportData?.revenue.total || 0);
  const operatingProfitMargin = calculateMargin(reportData?.operatingProfit || 0, reportData?.revenue.total || 0);
  const netProfitMargin = calculateMargin(reportData?.netProfit || 0, reportData?.revenue.total || 0);

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-slate-900">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 border-b border-pink-500/30 shadow-lg">
          <div className="px-8 py-6">
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
                    <p className="text-white/80 text-sm">Real-time income statement</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-white/90 text-sm">Period</p>
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

        {/* Filters Panel */}
        <div className="px-8 py-6">
          <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <span className="flex items-center">
                    <span className="h-2 w-2 bg-green-400 rounded-full mr-2"></span>
                    From Date
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dateRange.fromDate}
                    onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-slate-100"
                  />
                  <div className="absolute right-3 top-3 text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <span className="flex items-center">
                    <span className="h-2 w-2 bg-green-400 rounded-full mr-2"></span>
                    To Date
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dateRange.toDate}
                    onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-slate-100"
                  />
                  <div className="absolute right-3 top-3 text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-3">
                <button
                  onClick={fetchReport}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all duration-200 font-medium"
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
                    className="px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-sm hover:shadow transition-all duration-200"
                  >
                    <Download className="h-4 w-4 text-green-400" />
                    <span className="text-slate-200">Excel</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    disabled={!reportData || loading}
                    className="px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow transition-all duration-200"
                  >
                    <Printer className="h-4 w-4 text-slate-300" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Report Content */}
          {!reportData ? (
            <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-slate-700 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-200 mb-2">No Profit & Loss Data</h3>
                <p className="text-slate-400 mb-6">
                  Generate a profit & loss statement to view your financial performance.
                </p>
                <button
                  onClick={fetchReport}
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-2 font-medium"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Generate Report</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 bg-green-600">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">{user?.outletName || 'AutoCity Pro'}</h2>
                    <p className="text-sm text-white/90 mt-1">
                      Period: {new Date(dateRange.fromDate).toLocaleDateString()} - {new Date(dateRange.toDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
                    <span className="text-sm font-semibold text-white">
                      {formatCurrency(reportData.netProfit)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-8">
                {/* Revenue Section */}
                <div className="bg-slate-700/30 rounded-xl p-5 border border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-200 flex items-center">
                      <span className="h-3 w-3 bg-green-500 rounded-full mr-2"></span>
                      REVENUE
                    </h3>
                    <span className="font-bold text-green-400 text-lg">
                      {formatCurrency(reportData.revenue.total)}
                    </span>
                  </div>
                  <div className="space-y-2 pl-5">
                    {Object.keys(reportData.revenue.items).length > 0 ? (
                      renderCategoryItems(reportData.revenue.items, false)
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-slate-400 text-sm">No revenue items found</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Cost of Sales Section */}
                <div className="bg-slate-700/30 rounded-xl p-5 border border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-200 flex items-center">
                      <span className="h-3 w-3 bg-red-500 rounded-full mr-2"></span>
                      COST OF SALES
                    </h3>
                    <span className="font-bold text-red-400 text-lg">
                      {formatCurrency(-reportData.costOfSales.total)}
                    </span>
                  </div>
                  <div className="space-y-2 pl-5">
                    {Object.keys(reportData.costOfSales.items).length > 0 ? (
                      renderCategoryItems(reportData.costOfSales.items, true)
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-slate-400 text-sm">No cost of sales items found</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Gross Profit */}
                <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 p-6 rounded-xl border border-green-800/50">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-green-300">GROSS PROFIT</h3>
                      <p className="text-sm text-green-400">Margin: {grossProfitMargin}%</p>
                    </div>
                    <span className="text-2xl font-bold text-green-400">
                      {formatCurrency(reportData.grossProfit)}
                    </span>
                  </div>
                  <div className="mt-2 h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                </div>
                
                {/* Operating Expenses */}
                <div className="bg-slate-700/30 rounded-xl p-5 border border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-200 flex items-center">
                      <span className="h-3 w-3 bg-orange-500 rounded-full mr-2"></span>
                      OPERATING EXPENSES
                    </h3>
                    <span className="font-bold text-red-400 text-lg">
                      {formatCurrency(-reportData.expenses.total)}
                    </span>
                  </div>
                  <div className="space-y-2 pl-5">
                    {Object.keys(reportData.expenses.items).length > 0 ? (
                      renderCategoryItems(reportData.expenses.items, true)
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-slate-400 text-sm">No expense items found</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Operating Profit */}
                <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 p-6 rounded-xl border border-blue-800/50">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-blue-300">OPERATING PROFIT</h3>
                      <p className="text-sm text-blue-400">Margin: {operatingProfitMargin}%</p>
                    </div>
                    <span className="text-2xl font-bold text-blue-400">
                      {formatCurrency(reportData.operatingProfit)}
                    </span>
                  </div>
                  <div className="mt-2 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                </div>
                
                {/* Other Income */}
                {reportData.otherIncome.total > 0 && (
                  <div className="bg-slate-700/30 rounded-xl p-5 border border-slate-600">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-200 flex items-center">
                        <span className="h-3 w-3 bg-teal-500 rounded-full mr-2"></span>
                        OTHER INCOME
                      </h3>
                      <span className="font-bold text-green-400 text-lg">
                        {formatCurrency(reportData.otherIncome.total)}
                      </span>
                    </div>
                    <div className="space-y-2 pl-5">
                      {renderCategoryItems(reportData.otherIncome.items, false)}
                    </div>
                  </div>
                )}
                
                {/* Other Expenses */}
                {reportData.otherExpenses.total > 0 && (
                  <div className="bg-slate-700/30 rounded-xl p-5 border border-slate-600">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-200 flex items-center">
                        <span className="h-3 w-3 bg-pink-500 rounded-full mr-2"></span>
                        OTHER EXPENSES
                      </h3>
                      <span className="font-bold text-red-400 text-lg">
                        {formatCurrency(-reportData.otherExpenses.total)}
                      </span>
                    </div>
                    <div className="space-y-2 pl-5">
                      {renderCategoryItems(reportData.otherExpenses.items, true)}
                    </div>
                  </div>
                )}
                
                {/* Net Profit */}
                <div className={`${reportData.netProfit >= 0 ? 'bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border-purple-800/50' : 'bg-gradient-to-r from-red-900/30 to-pink-900/30 border-red-800/50'} p-6 rounded-xl border`}>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-200">NET PROFIT</h3>
                      <p className="text-sm text-slate-300">Net Profit Margin: {netProfitMargin}%</p>
                    </div>
                    <span className={`text-3xl font-bold ${reportData.netProfit >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                      {formatCurrency(reportData.netProfit)}
                    </span>
                  </div>
                  <div className={`mt-2 h-1 rounded-full ${reportData.netProfit >= 0 ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gradient-to-r from-red-500 to-pink-500'}`}></div>
                  <div className="flex items-center justify-center space-x-2 mt-4">
                    {reportData.netProfit >= 0 ? (
                      <div className="w-6 h-6 bg-green-900/50 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-red-900/50 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </div>
                    )}
                    <p className={`text-sm font-medium ${reportData.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {reportData.netProfit >= 0 ? 'Profitable Period' : 'Loss Period'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-700 text-center">
                <p className="text-sm text-slate-400">
                  Generated on: {new Date().toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}