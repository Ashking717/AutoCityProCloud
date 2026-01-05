'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Download, Printer, ShoppingCart, TrendingUp, Users, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PurchasesReportPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
  });
  const [viewMode, setViewMode] = useState<'summary' | 'detailed' | 'bySupplier' | 'byCategory'>('summary');
  
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
        `/api/reports/purchases?fromDate=${dateRange.fromDate}&toDate=${dateRange.toDate}`,
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
            <p className="text-gray-600">Generating purchases report...</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  const summary = reportData.summary || {
    totalPurchases: 0,
    totalPurchaseAmount: 0,
    totalPayments: 0,
    totalPaymentAmount: 0,
    averagePurchaseValue: 0,
    outstandingPayables: 0,
  };
  
  const purchases = reportData.purchases || [];
  const supplierPurchases = reportData.supplierPurchases || {};
  const categoryPurchases = reportData.categoryPurchases || {};
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <ShoppingCart className="h-8 w-8 text-orange-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Purchases Report</h1>
              <p className="text-gray-600 mt-1">Detailed purchase analysis</p>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                Generate
              </button>
            </div>
            <div className="flex items-end space-x-2 col-span-2">
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
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalPurchases}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Purchase Amount</p>
                <p className="text-2xl font-bold text-orange-600">QAR {summary.totalPurchaseAmount.toFixed(2)}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold text-green-600">QAR {summary.totalPaymentAmount.toFixed(2)}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Purchase</p>
                <p className="text-2xl font-bold text-blue-600">QAR {summary.averagePurchaseValue.toFixed(2)}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
        
        {/* View Mode Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { key: 'summary', label: 'Summary' },
                { key: 'detailed', label: 'Detailed Purchases' },
                { key: 'bySupplier', label: 'By Supplier' },
                { key: 'byCategory', label: 'By Category' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setViewMode(tab.key as any)}
                  className={`${
                    viewMode === tab.key
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-6">
            {viewMode === 'summary' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-l-4 border-orange-500 pl-4">
                    <p className="text-sm text-gray-600">Total Purchase Value</p>
                    <p className="text-xl font-bold text-gray-900">QAR {summary.totalPurchaseAmount.toLocaleString()}</p>
                  </div>
                  <div className="border-l-4 border-green-500 pl-4">
                    <p className="text-sm text-gray-600">Total Paid</p>
                    <p className="text-xl font-bold text-green-600">QAR {summary.totalPaymentAmount.toLocaleString()}</p>
                  </div>
                </div>
                <div className="border-l-4 border-red-500 pl-4">
                  <p className="text-sm text-gray-600">Outstanding Payables</p>
                  <p className="text-xl font-bold text-red-600">
                    QAR {(summary.totalPurchaseAmount - summary.totalPaymentAmount).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
            
            {viewMode === 'detailed' && (
              <div className="overflow-x-auto">
                {purchases.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">No purchases found for this period</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voucher #</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {purchases.map((purchase: any) => (
                        <tr key={purchase._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{new Date(purchase.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm font-medium">{purchase.voucherNumber}</td>
                          <td className="px-4 py-3 text-sm">{purchase.narration}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold">
                            QAR {purchase.totalDebit.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              purchase.status === 'approved' ? 'bg-green-100 text-green-800' :
                              purchase.status === 'posted' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {purchase.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            
            {viewMode === 'bySupplier' && (
              <div className="overflow-x-auto">
                {Object.keys(supplierPurchases).length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">No supplier data available</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Purchases</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Payments</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance Due</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(supplierPurchases)
                        .sort((a: any, b: any) => b[1].amount - a[1].amount)
                        .map(([supplier, data]: [string, any]) => (
                          <tr key={supplier} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium">{supplier}</td>
                            <td className="px-4 py-3 text-sm text-right">{data.count}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold">
                              QAR {data.amount.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-green-600">
                              QAR {data.payments.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className={(data.amount - data.payments) > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                                QAR {(data.amount - data.payments).toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            
            {viewMode === 'byCategory' && (
              <div className="overflow-x-auto">
                {Object.keys(categoryPurchases).length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">No category data available</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Purchases</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Purchase</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(categoryPurchases)
                        .sort((a: any, b: any) => b[1].amount - a[1].amount)
                        .map(([category, data]: [string, any]) => (
                          <tr key={category} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium">{category}</td>
                            <td className="px-4 py-3 text-sm text-right">{data.count}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold">
                              QAR {data.amount.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              QAR {(data.amount / data.count).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
