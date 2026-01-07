'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Download, Printer, BarChart3, Loader2, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

// Types for the API response
interface BalanceSheetItem {
  items: { [key: string]: number };
  total: number;
}

interface BalanceSheetData {
  assets: {
    currentAssets: BalanceSheetItem;
    fixedAssets: BalanceSheetItem;
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: BalanceSheetItem;
    longTermLiabilities: BalanceSheetItem;
    totalLiabilities: number;
  };
  equity: {
    items: { [key: string]: number };
    total: number;
  };
  isBalanced: boolean;
}

export default function BalanceSheetPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<BalanceSheetData | null>(null);
  
  useEffect(() => {
    fetchUser();
    fetchBalanceSheet();
  }, [asOfDate]);
  
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
  
  const fetchBalanceSheet = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ asOfDate });
      const res = await fetch(`/api/reports/balance-sheet?${params}`, {
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        setReportData(data.reportData);
      } else {
        toast.error('Failed to fetch balance sheet data');
      }
    } catch (error) {
      console.error('Error fetching balance sheet:', error);
      toast.error('Error loading balance sheet');
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
    if (format === 'pdf') {
      // Client-side PDF generation
      toast.loading('Generating PDF...');
      
      // Dynamic import to avoid SSR issues
      const { exportToPDF } = await import('@/lib/export/balanceSheetPDF');
      exportToPDF(reportData, asOfDate, user?.outletName || 'AutoCity Pro');
      
      toast.dismiss();
      toast.success('PDF generated successfully');
      
    } else if (format === 'excel') {
      // Server-side Excel generation
      toast.loading('Generating Excel file...');
      
      const params = new URLSearchParams({ 
        asOfDate,
        format: 'excel'
      });
      
      const res = await fetch(`/api/reports/balance-sheet/export?${params}`, {
        credentials: 'include',
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `balance-sheet-${asOfDate}.xlsx`;
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
  
  const renderAccountItems = (items: { [key: string]: number }, showNegative: boolean = false) => {
    return Object.entries(items).map(([name, value]) => (
      <div key={name} className="flex justify-between hover:bg-slate-700/50 p-2 rounded transition-colors">
        <span className="text-slate-300 capitalize">{name.replace(/([A-Z])/g, ' $1').trim()}</span>
        <span className={`font-semibold ${value < 0 ? 'text-red-400' : 'text-slate-100'}`}>
          {formatCurrency(Math.abs(value))}
        </span>
      </div>
    ));
  };
  
  if (loading && !reportData) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-screen bg-slate-900">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          <span className="ml-2 text-slate-300">Loading balance sheet...</span>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-slate-900">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 border-b border-purple-500/30 shadow-lg">
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
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Balance Sheet</h1>
                    <p className="text-white/80 text-sm">Statement of financial position</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-white/90 text-sm">As of</p>
                  <p className="text-white font-semibold">{new Date(asOfDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
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
                    <span className="h-2 w-2 bg-indigo-400 rounded-full mr-2"></span>
                    As of Date
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-100"
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
                  onClick={fetchBalanceSheet}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4" />
                      <span>Generate Report</span>
                    </>
                  )}
                </button>
              </div>
              
              <div className="lg:col-span-6">
                <div className="flex items-center justify-end space-x-3">
                  <span className="text-sm font-medium text-slate-300">Export:</span>
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={!reportData || loading}
                    className="px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-sm hover:shadow transition-all duration-200"
                  >
                    <Download className="h-4 w-4 text-red-400" />
                    <span className="text-slate-200">PDF</span>
                  </button>
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
                  <BarChart3 className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-200 mb-2">No Balance Sheet Data</h3>
                <p className="text-slate-400 mb-6">
                  Generate a balance sheet report to view your financial position.
                </p>
                <button
                  onClick={fetchBalanceSheet}
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-2 font-medium"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Generate Report</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assets Card */}
              <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:border-slate-600">
                <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 border-b border-blue-500/30">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">ASSETS</h2>
                    <div className="px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
                      <span className="text-sm font-semibold text-white">
                        {formatCurrency(reportData.assets.totalAssets)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-white/90 mt-1">Resources owned by the business</p>
                </div>
                
                <div className="p-6">
                  {/* Current Assets */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-200 flex items-center">
                        <span className="h-3 w-3 bg-blue-500 rounded-full mr-2"></span>
                        CURRENT ASSETS
                      </h3>
                      <span className="font-bold text-blue-400">
                        {formatCurrency(reportData.assets.currentAssets.total)}
                      </span>
                    </div>
                    <div className="space-y-2 pl-5">
                      {Object.keys(reportData.assets.currentAssets.items).length > 0 ? (
                        renderAccountItems(reportData.assets.currentAssets.items)
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-slate-400 text-sm">No current assets found</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Fixed Assets */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-200 flex items-center">
                        <span className="h-3 w-3 bg-indigo-500 rounded-full mr-2"></span>
                        FIXED ASSETS
                      </h3>
                      <span className="font-bold text-indigo-400">
                        {formatCurrency(reportData.assets.fixedAssets.total)}
                      </span>
                    </div>
                    <div className="space-y-2 pl-5">
                      {Object.keys(reportData.assets.fixedAssets.items).length > 0 ? (
                        renderAccountItems(reportData.assets.fixedAssets.items, true)
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-slate-400 text-sm">No fixed assets found</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Total Assets */}
                  <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 p-5 rounded-xl border border-blue-800/50">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold text-blue-300">TOTAL ASSETS</h3>
                      <span className="text-2xl font-bold text-blue-400">
                        {formatCurrency(reportData.assets.totalAssets)}
                      </span>
                    </div>
                    <div className="mt-2 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                  </div>
                </div>
              </div>
              
              {/* Liabilities & Equity Card */}
              <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:border-slate-600">
                <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 border-b border-purple-500/30">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">LIABILITIES & EQUITY</h2>
                    <div className="px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
                      <span className="text-sm font-semibold text-white">
                        {formatCurrency(reportData.liabilities.totalLiabilities + reportData.equity.total)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-white/90 mt-1">Obligations and ownership interest</p>
                </div>
                
                <div className="p-6">
                  {/* Current Liabilities */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-200 flex items-center">
                        <span className="h-3 w-3 bg-red-500 rounded-full mr-2"></span>
                        CURRENT LIABILITIES
                      </h3>
                      <span className="font-bold text-red-400">
                        {formatCurrency(reportData.liabilities.currentLiabilities.total)}
                      </span>
                    </div>
                    <div className="space-y-2 pl-5">
                      {Object.keys(reportData.liabilities.currentLiabilities.items).length > 0 ? (
                        renderAccountItems(reportData.liabilities.currentLiabilities.items)
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-slate-400 text-sm">No current liabilities found</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Long-term Liabilities */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-200 flex items-center">
                        <span className="h-3 w-3 bg-orange-500 rounded-full mr-2"></span>
                        LONG-TERM LIABILITIES
                      </h3>
                      <span className="font-bold text-orange-400">
                        {formatCurrency(reportData.liabilities.longTermLiabilities.total)}
                      </span>
                    </div>
                    <div className="space-y-2 pl-5">
                      {Object.keys(reportData.liabilities.longTermLiabilities.items).length > 0 ? (
                        renderAccountItems(reportData.liabilities.longTermLiabilities.items)
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-slate-400 text-sm">No long-term liabilities found</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Total Liabilities */}
                  <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 p-5 rounded-xl border border-red-800/50 mb-8">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold text-red-300">TOTAL LIABILITIES</h3>
                      <span className="text-2xl font-bold text-red-400">
                        {formatCurrency(reportData.liabilities.totalLiabilities)}
                      </span>
                    </div>
                    <div className="mt-2 h-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-full"></div>
                  </div>
                  
                  {/* Equity */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-200 flex items-center">
                        <span className="h-3 w-3 bg-green-500 rounded-full mr-2"></span>
                        EQUITY
                      </h3>
                      <span className="font-bold text-green-400">
                        {formatCurrency(reportData.equity.total)}
                      </span>
                    </div>
                    <div className="space-y-2 pl-5">
                      {Object.keys(reportData.equity.items).length > 0 ? (
                        renderAccountItems(reportData.equity.items)
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-slate-400 text-sm">No equity accounts found</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Total Liabilities & Equity */}
                  <div className={`${reportData.isBalanced ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-800/50' : 'bg-gradient-to-r from-red-900/30 to-pink-900/30 border-red-800/50'} p-5 rounded-xl border`}>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className={`text-lg font-bold ${reportData.isBalanced ? 'text-green-300' : 'text-red-300'}`}>
                        TOTAL LIABILITIES & EQUITY
                      </h3>
                      <span className={`text-2xl font-bold ${reportData.isBalanced ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(reportData.liabilities.totalLiabilities + reportData.equity.total)}
                      </span>
                    </div>
                    <div className={`mt-2 h-1 rounded-full ${reportData.isBalanced ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-pink-500'}`}></div>
                    {reportData.isBalanced ? (
                      <div className="flex items-center justify-center space-x-2 mt-3">
                        <div className="w-6 h-6 bg-green-900/50 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-green-400">Balance Sheet is balanced</p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2 mt-3">
                        <div className="w-6 h-6 bg-red-900/50 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-red-400">Balance Sheet is not balanced</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}