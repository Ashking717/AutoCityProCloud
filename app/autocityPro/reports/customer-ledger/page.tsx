'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Download, Printer, Users, ArrowRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomerLedgerPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
  });
  
  useEffect(() => {
    fetchUser();
    fetchCustomers();
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
  
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/customer-ledger', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchLedger = async (customerId: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports/customer-ledger?customerId=${customerId}&fromDate=${dateRange.fromDate}&toDate=${dateRange.toDate}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setLedgerData(data);
        setSelectedCustomer(data.customer);
      }
    } catch (error) {
      toast.error('Failed to fetch ledger');
    } finally {
      setLoading(false);
    }
  };
  
  const handleBack = () => {
    setSelectedCustomer(null);
    setLedgerData(null);
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  if (!selectedCustomer) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-pink-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Customer Ledger</h1>
                <p className="text-gray-600 mt-1">Select a customer to view their account statement</p>
              </div>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Sales</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Paid</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Loading customers...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No customers found</p>
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                          <p className="text-xs text-gray-500">{customer.phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-right">QAR {customer.totalSales.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-right text-green-600">QAR {customer.totalPaid.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-right">
                        <span className={customer.balance > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                          QAR {customer.balance.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => fetchLedger(customer._id)}
                          className="inline-flex items-center space-x-1 text-purple-600 hover:text-purple-900"
                        >
                          <span>View Ledger</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
            <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{selectedCustomer.name}</h1>
              <p className="text-gray-600 mt-1">{selectedCustomer.phone} | {selectedCustomer.email}</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Printer className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Date Range */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">From Date</label>
              <input
                type="date"
                value={dateRange.fromDate}
                onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">To Date</label>
              <input
                type="date"
                value={dateRange.toDate}
                onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => fetchLedger(selectedCustomer._id)}
                disabled={loading}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
        
        {/* Summary */}
        {ledgerData && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total Debit</p>
              <p className="text-xl font-bold text-gray-900">QAR {ledgerData.summary.totalDebit.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total Credit</p>
              <p className="text-xl font-bold text-green-600">QAR {ledgerData.summary.totalCredit.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Closing Balance</p>
              <p className={`text-xl font-bold ${ledgerData.summary.closingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                QAR {ledgerData.summary.closingBalance.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-xl font-bold text-blue-600">{ledgerData.summary.salesCount}</p>
            </div>
          </div>
        )}
        
        {/* Ledger Entries */}
        {ledgerData && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ledgerData.ledgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No transactions found for this period
                    </td>
                  </tr>
                ) : (
                  ledgerData.ledgerEntries.map((entry: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(entry.date).toLocaleDateString()}
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
                        <span className={entry.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                          QAR {Math.abs(entry.balance).toFixed(2)} {entry.balance > 0 ? 'Dr' : 'Cr'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
