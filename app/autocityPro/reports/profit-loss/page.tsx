'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Download, Printer, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfitLossPage() {
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
        `/api/reports/profit-loss?fromDate=${dateRange.fromDate}&toDate=${dateRange.toDate}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setReportData(data.reportData);
      } else {
        toast.error('Failed to generate report');
      }
    } catch (error) {
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
            <p className="text-gray-600">Generating report...</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  const grossProfitMargin = ((reportData.grossProfit / reportData.revenue.total) * 100).toFixed(2);
  const operatingProfitMargin = ((reportData.operatingProfit / reportData.revenue.total) * 100).toFixed(2);
  const netProfitMargin = ((reportData.netProfit / reportData.revenue.total) * 100).toFixed(2);
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Profit & Loss Statement</h1>
              <p className="text-gray-600 mt-1">Real-time income statement</p>
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
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Generate Report
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
        
        {/* Report */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
            <h2 className="text-xl font-bold">AutoCity Pro</h2>
            <p className="text-sm opacity-90">
              Period: {new Date(dateRange.fromDate).toLocaleDateString()} - {new Date(dateRange.toDate).toLocaleDateString()}
            </p>
          </div>
          
          <div className="p-6">
            {/* Revenue */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b-2 border-gray-200 pb-2">REVENUE</h3>
              <div className="space-y-2 pl-4">
                <div className="flex justify-between">
                  <span className="text-gray-700">Sales Revenue</span>
                  <span className="font-semibold">QAR {reportData.revenue.sales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold text-green-600">
                  <span>Total Revenue</span>
                  <span>QAR {reportData.revenue.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            {/* Cost of Sales */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b-2 border-gray-200 pb-2">COST OF SALES</h3>
              <div className="space-y-2 pl-4">
                <div className="flex justify-between">
                  <span className="text-gray-700">Opening Stock</span>
                  <span className="font-semibold">QAR {reportData.costOfSales.openingStock.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Purchases</span>
                  <span className="font-semibold">QAR {reportData.costOfSales.purchases.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Closing Stock</span>
                  <span className="font-semibold text-red-600">-QAR {reportData.costOfSales.closingStock.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold text-red-600">
                  <span>Total Cost of Sales</span>
                  <span>QAR {reportData.costOfSales.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            {/* Gross Profit */}
            <div className="mb-6 bg-green-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-green-900">GROSS PROFIT</h3>
                  <p className="text-sm text-green-700">Margin: {grossProfitMargin}%</p>
                </div>
                <span className="text-2xl font-bold text-green-600">QAR {reportData.grossProfit.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Operating Expenses */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b-2 border-gray-200 pb-2">OPERATING EXPENSES</h3>
              <div className="space-y-2 pl-4">
                {Object.entries(reportData.expenses.categories).map(([category, amount]: [string, any]) => (
                  <div key={category} className="flex justify-between">
                    <span className="text-gray-700">{category}</span>
                    <span className="font-semibold">QAR {amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t font-bold text-red-600">
                  <span>Total Operating Expenses</span>
                  <span>QAR {reportData.expenses.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            {/* Net Profit */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-lg">
              <div className="flex justify-between items-center text-white">
                <div>
                  <h3 className="text-2xl font-bold">NET PROFIT</h3>
                  <p className="text-sm opacity-90">Net Profit Margin: {netProfitMargin}%</p>
                </div>
                <span className="text-4xl font-bold">QAR {reportData.netProfit.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
