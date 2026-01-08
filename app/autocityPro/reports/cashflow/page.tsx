'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Download, Printer, Activity, Loader2, ChevronLeft, TrendingUp, TrendingDown } from 'lucide-react';
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
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
  });
  const [reportData, setReportData] = useState<CashFlowData | null>(null);
  
  useEffect(() => {
    fetchUser();
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
  
  const renderCashFlowItems = (items: { [key: string]: number }) => {
    if (!items || Object.keys(items).length === 0) {
      return (
        <div className="text-center py-4">
          <p className="text-slate-400 text-sm">No activities in this period</p>
        </div>
      );
    }

    return Object.entries(items).map(([name, value]) => (
      <div key={name} className="flex justify-between items-center hover:bg-slate-700/50 px-3 py-2.5 rounded transition-colors">
        <span className="text-slate-300">{name}</span>
        <span className={`font-semibold ${value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {value >= 0 ? '+' : ''}{formatCurrency(value)}
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
        <div className="flex items-center justify-center min-h-screen bg-slate-900">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-4" />
            <p className="text-slate-300">Generating cash flow statement...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <p className="text-indigo-100 mt-1">Operating, investing, and financing activities</p>
              </div>
              
              {reportData && (
                <div className="text-right">
                  <p className="text-sm text-indigo-100">Net Cash Flow</p>
                  <p className={`text-2xl font-bold ${reportData.netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {reportData.netCashFlow >= 0 ? '+' : ''}{formatCurrency(reportData.netCashFlow)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateRange.fromDate}
                  onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  value={dateRange.toDate}
                  onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-100"
                />
              </div>
              
              <div>
                <button
                  onClick={fetchReport}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-200"
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
                  className="flex-1 px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm hover:shadow transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                  <span>PDF</span>
                </button>
                
                <button
                  onClick={() => window.print()}
                  disabled={!reportData || loading}
                  className="px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow transition-all duration-200"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Report Content */}
          {!reportData ? (
            <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-12 text-center">
              <Activity className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-300 mb-2">
                No Cash Flow Data
              </h3>
              <p className="text-slate-400 mb-6">
                Generate a cash flow statement to view your cash movements.
              </p>
              <button
                onClick={fetchReport}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium inline-flex items-center space-x-2"
              >
                <Activity className="w-5 h-5" />
                <span>Generate Report</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 border border-blue-700/50 rounded-xl p-4">
                  <p className="text-blue-300 text-sm font-medium mb-1">Opening Cash</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(reportData.openingCash)}</p>
                </div>
                
                <div className={`bg-gradient-to-br ${reportData.operatingActivities.total >= 0 ? 'from-green-900/30 to-green-800/30 border-green-700/50' : 'from-red-900/30 to-red-800/30 border-red-700/50'} border rounded-xl p-4`}>
                  <p className={`${reportData.operatingActivities.total >= 0 ? 'text-green-300' : 'text-red-300'} text-sm font-medium mb-1`}>
                    Operating Activities
                  </p>
                  <p className={`text-2xl font-bold ${reportData.operatingActivities.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {reportData.operatingActivities.total >= 0 ? '+' : ''}{formatCurrency(reportData.operatingActivities.total)}
                  </p>
                </div>
                
                <div className={`bg-gradient-to-br ${reportData.investingActivities.total >= 0 ? 'from-purple-900/30 to-purple-800/30 border-purple-700/50' : 'from-orange-900/30 to-orange-800/30 border-orange-700/50'} border rounded-xl p-4`}>
                  <p className={`${reportData.investingActivities.total >= 0 ? 'text-purple-300' : 'text-orange-300'} text-sm font-medium mb-1`}>
                    Investing Activities
                  </p>
                  <p className={`text-2xl font-bold ${reportData.investingActivities.total >= 0 ? 'text-purple-400' : 'text-orange-400'}`}>
                    {reportData.investingActivities.total >= 0 ? '+' : ''}{formatCurrency(reportData.investingActivities.total)}
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-indigo-900/30 to-indigo-800/30 border border-indigo-700/50 rounded-xl p-4">
                  <p className="text-indigo-300 text-sm font-medium mb-1">Closing Cash</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(reportData.closingCash)}</p>
                </div>
              </div>

              {/* Main Report */}
              <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 border-b border-indigo-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">{user?.outletName || 'AutoCity Pro'}</h2>
                      <p className="text-sm text-white/90 mt-1">
                        Cash Flow Statement - {new Date(dateRange.fromDate).toLocaleDateString()} to {new Date(dateRange.toDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Operating Activities */}
                  <div className="bg-slate-700/30 rounded-xl border border-slate-600 overflow-hidden">
                    <div className={`px-5 py-4 ${reportData.operatingActivities.total >= 0 ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-200 flex items-center">
                          <span className={`h-3 w-3 ${reportData.operatingActivities.total >= 0 ? 'bg-green-500' : 'bg-red-500'} rounded-full mr-2`}></span>
                          CASH FLOWS FROM OPERATING ACTIVITIES
                        </h3>
                        <span className={`font-bold text-xl ${reportData.operatingActivities.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {reportData.operatingActivities.total >= 0 ? '+' : ''}{formatCurrency(reportData.operatingActivities.total)}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      {renderCashFlowItems(reportData.operatingActivities.items)}
                    </div>
                  </div>
                  
                  {/* Investing Activities */}
                  <div className="bg-slate-700/30 rounded-xl border border-slate-600 overflow-hidden">
                    <div className={`px-5 py-4 ${reportData.investingActivities.total >= 0 ? 'bg-purple-900/20' : 'bg-orange-900/20'}`}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-200 flex items-center">
                          <span className={`h-3 w-3 ${reportData.investingActivities.total >= 0 ? 'bg-purple-500' : 'bg-orange-500'} rounded-full mr-2`}></span>
                          CASH FLOWS FROM INVESTING ACTIVITIES
                        </h3>
                        <span className={`font-bold text-xl ${reportData.investingActivities.total >= 0 ? 'text-purple-400' : 'text-orange-400'}`}>
                          {reportData.investingActivities.total >= 0 ? '+' : ''}{formatCurrency(reportData.investingActivities.total)}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      {renderCashFlowItems(reportData.investingActivities.items)}
                    </div>
                  </div>
                  
                  {/* Financing Activities */}
                  <div className="bg-slate-700/30 rounded-xl border border-slate-600 overflow-hidden">
                    <div className={`px-5 py-4 ${reportData.financingActivities.total >= 0 ? 'bg-blue-900/20' : 'bg-pink-900/20'}`}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-200 flex items-center">
                          <span className={`h-3 w-3 ${reportData.financingActivities.total >= 0 ? 'bg-blue-500' : 'bg-pink-500'} rounded-full mr-2`}></span>
                          CASH FLOWS FROM FINANCING ACTIVITIES
                        </h3>
                        <span className={`font-bold text-xl ${reportData.financingActivities.total >= 0 ? 'text-blue-400' : 'text-pink-400'}`}>
                          {reportData.financingActivities.total >= 0 ? '+' : ''}{formatCurrency(reportData.financingActivities.total)}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      {renderCashFlowItems(reportData.financingActivities.items)}
                    </div>
                  </div>
                  
                  {/* Net Cash Flow */}
                  <div className={`${reportData.netCashFlow >= 0 ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-700' : 'bg-gradient-to-r from-red-900/30 to-pink-900/30 border-red-700'} p-6 rounded-xl border-2`}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xl font-bold text-white flex items-center">
                        {reportData.netCashFlow >= 0 ? (
                          <TrendingUp className="w-6 h-6 mr-2 text-green-400" />
                        ) : (
                          <TrendingDown className="w-6 h-6 mr-2 text-red-400" />
                        )}
                        NET CHANGE IN CASH
                      </h3>
                      <span className={`text-3xl font-bold ${reportData.netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {reportData.netCashFlow >= 0 ? '+' : ''}{formatCurrency(reportData.netCashFlow)}
                      </span>
                    </div>
                    <div className={`h-2 rounded-full ${reportData.netCashFlow >= 0 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-pink-500'}`}></div>
                  </div>
                  
                  {/* Cash Reconciliation */}
                  <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 p-6 rounded-xl border-2 border-blue-700/50">
                    <h3 className="text-xl font-bold text-blue-300 mb-4 flex items-center">
                      <Activity className="w-5 h-5 mr-2" />
                      CASH RECONCILIATION
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 text-lg">Opening Cash Balance</span>
                        <span className="font-semibold text-slate-100 text-lg">
                          {formatCurrency(reportData.openingCash)}
                        </span>
                      </div>
                      <div className="h-px bg-blue-700/30"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 text-lg">Net Change in Cash</span>
                        <span className={`font-semibold text-lg ${reportData.netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {reportData.netCashFlow >= 0 ? '+' : ''}{formatCurrency(reportData.netCashFlow)}
                        </span>
                      </div>
                      <div className="h-px bg-blue-700/50"></div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-xl font-bold text-blue-300">Closing Cash Balance</span>
                        <span className="text-2xl font-bold text-blue-400">
                          {formatCurrency(reportData.closingCash)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Footer */}
                <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-700 text-center">
                  <p className="text-sm text-slate-400">
                    Generated on: {new Date().toLocaleString()} | Period: {new Date(dateRange.fromDate).toLocaleDateString()} - {new Date(dateRange.toDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}