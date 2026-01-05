'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Download, Printer, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CashFlowPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
  });
  
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
      const res = await fetch(
        `/api/reports/cashflow?fromDate=${dateRange.fromDate}&toDate=${dateRange.toDate}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        toast.error('Failed to generate report');
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  if (loading || !reportData) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Generating cash flow statement...</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Activity className="h-8 w-8 text-red-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cash Flow Statement</h1>
              <p className="text-gray-600 mt-1">Operating, investing, and financing activities</p>
            </div>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Back
          </button>
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={dateRange.fromDate}
                onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={dateRange.toDate}
                onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchReport}
                disabled={loading}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Generate
              </button>
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={() => toast.success('PDF export coming soon!')}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                <span>PDF</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Printer className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Cash Flow Statement */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-pink-600 text-white">
            <h2 className="text-xl font-bold">AutoCity Pro</h2>
            <p className="text-sm opacity-90">
              Period: {new Date(dateRange.fromDate).toLocaleDateString()} - {new Date(dateRange.toDate).toLocaleDateString()}
            </p>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Operating Activities */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b-2 border-gray-200 pb-2">
                CASH FLOWS FROM OPERATING ACTIVITIES
              </h3>
              <div className="space-y-2 pl-4">
                <div className="flex justify-between">
                  <span className="text-gray-700">Cash from Sales</span>
                  <span className="font-semibold text-green-600">
                    QAR {reportData.operatingActivities.cashFromSales.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Cash Paid for Expenses</span>
                  <span className="font-semibold text-red-600">
                    QAR {reportData.operatingActivities.cashPaidForExpenses.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold">
                  <span>Net Cash from Operating Activities</span>
                  <span className={reportData.operatingActivities.netOperatingCash >= 0 ? 'text-green-600' : 'text-red-600'}>
                    QAR {reportData.operatingActivities.netOperatingCash.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Investing Activities */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b-2 border-gray-200 pb-2">
                CASH FLOWS FROM INVESTING ACTIVITIES
              </h3>
              <div className="space-y-2 pl-4">
                <div className="flex justify-between">
                  <span className="text-gray-700">Purchase of Assets</span>
                  <span className="font-semibold text-red-600">
                    QAR {reportData.investingActivities.assetPurchases.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Sale of Assets</span>
                  <span className="font-semibold text-green-600">
                    QAR {reportData.investingActivities.assetSales.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold">
                  <span>Net Cash from Investing Activities</span>
                  <span className={reportData.investingActivities.netInvestingCash >= 0 ? 'text-green-600' : 'text-red-600'}>
                    QAR {reportData.investingActivities.netInvestingCash.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Financing Activities */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b-2 border-gray-200 pb-2">
                CASH FLOWS FROM FINANCING ACTIVITIES
              </h3>
              <div className="space-y-2 pl-4">
                <div className="flex justify-between">
                  <span className="text-gray-700">Loan Receipts</span>
                  <span className="font-semibold text-green-600">
                    QAR {reportData.financingActivities.loanReceipts.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Loan Repayments</span>
                  <span className="font-semibold text-red-600">
                    QAR {reportData.financingActivities.loanRepayments.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold">
                  <span>Net Cash from Financing Activities</span>
                  <span className={reportData.financingActivities.netFinancingCash >= 0 ? 'text-green-600' : 'text-red-600'}>
                    QAR {reportData.financingActivities.netFinancingCash.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Net Change in Cash */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-blue-900">NET CHANGE IN CASH</h3>
                <span className={`text-2xl font-bold ${reportData.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  QAR {reportData.netCashFlow.toFixed(2)}
                </span>
              </div>
            </div>
            
            {/* Cash Reconciliation */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">Opening Cash Balance</span>
                  <span className="font-semibold">QAR {reportData.openingCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Net Change in Cash</span>
                  <span className={`font-semibold ${reportData.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    QAR {reportData.netCashFlow.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-gray-300 font-bold text-lg">
                  <span>Closing Cash Balance</span>
                  <span className="text-blue-600">QAR {reportData.closingCash.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
