'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Download, Printer, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DaybookPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
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
        `/api/reports/daybook?date=${selectedDate}`,
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
            <p className="text-gray-600">Generating daybook...</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  const summary = reportData.summary || {
    totalDebit: 0,
    totalCredit: 0,
    netBalance: 0,
    totalTransactions: 0,
    salesCount: 0,
    vouchersCount: 0,
  };
  
  const entries = reportData.entries || [];
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Calendar className="h-8 w-8 text-teal-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Daybook</h1>
              <p className="text-gray-600 mt-1">Daily transaction summary</p>
            </div>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Back
          </button>
        </div>
        
        {/* Date Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchReport}
                disabled={loading}
                className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
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
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Debit</p>
                <p className="text-2xl font-bold text-gray-900">QAR {summary.totalDebit.toFixed(2)}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Credit</p>
                <p className="text-2xl font-bold text-green-600">QAR {summary.totalCredit.toFixed(2)}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingDown className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Balance</p>
                <p className={`text-2xl font-bold ${summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  QAR {summary.netBalance.toFixed(2)}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Transactions</p>
                <p className="text-2xl font-bold text-purple-600">{summary.totalTransactions}</p>
                <p className="text-xs text-gray-500">Sales: {summary.salesCount} | Vouchers: {summary.vouchersCount}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Daybook Entries */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
            <h2 className="text-xl font-bold">Daily Transactions</h2>
            <p className="text-sm opacity-90">
              {new Date(reportData.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No transactions for this day</p>
                    </td>
                  </tr>
                ) : (
                  entries.map((entry: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(entry.time).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          entry.type === 'Sale' ? 'bg-green-100 text-green-800' :
                          entry.type === 'Payment' ? 'bg-red-100 text-red-800' :
                          entry.type === 'Receipt' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {entry.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{entry.reference}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{entry.description}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        {entry.debit > 0 ? `QAR ${entry.debit.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-green-600">
                        {entry.credit > 0 ? `QAR ${entry.credit.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold">
                        <span className={entry.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                          QAR {Math.abs(entry.balance).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {entries.length > 0 && (
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-right">Total:</td>
                    <td className="px-6 py-4 text-right">QAR {summary.totalDebit.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-green-600">QAR {summary.totalCredit.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                        QAR {Math.abs(summary.netBalance).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
