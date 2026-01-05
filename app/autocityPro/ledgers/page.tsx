// app/autocityPro/ledgers/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { BookOpen, Search, Plus, Eye, ArrowLeft, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LedgersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  
  // Ledger detail view
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
  });
  
  useEffect(() => {
    fetchUser();
    fetchAccounts();
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
  
  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Failed to fetch accounts');
      toast.error('Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchLedger = async (accountId: string) => {
    try {
      const res = await fetch(
        `/api/ledgers/${accountId}?fromDate=${dateRange.fromDate}&toDate=${dateRange.toDate}`,
        { credentials: 'include' }
      );
      
      if (res.ok) {
        const data = await res.json();
        setLedgerData(data);
      } else {
        toast.error('Failed to fetch ledger');
      }
    } catch (error) {
      console.error('Error fetching ledger:', error);
      toast.error('Failed to fetch ledger');
    }
  };
  
  const handleViewLedger = (account: any) => {
    setSelectedAccount(account);
    fetchLedger(account._id);
  };
  
  const handleBack = () => {
    setSelectedAccount(null);
    setLedgerData(null);
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = 
      acc.accountName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.accountNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || acc.accountType === filterType;
    
    return matchesSearch && matchesType;
  });
  
  const accountTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'asset', label: 'Assets' },
    { value: 'liability', label: 'Liabilities' },
    { value: 'equity', label: 'Equity' },
    { value: 'revenue', label: 'Revenue' },
    { value: 'expense', label: 'Expenses' },
  ];
  
  // Ledger Detail View
  if (selectedAccount && ledgerData) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="bg-slate-900 min-h-screen p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{selectedAccount.accountName}</h1>
                <p className="text-gray-600 mt-1">{selectedAccount.accountNumber} - {selectedAccount.accountType}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Printer className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Date Filter */}
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
                  onClick={() => fetchLedger(selectedAccount._id)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
          
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Opening Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                QAR {ledgerData.summary.openingBalance.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Debit</p>
              <p className="text-2xl font-bold text-red-600">
                QAR {ledgerData.summary.totalDebit.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Credit</p>
              <p className="text-2xl font-bold text-green-600">
                QAR {ledgerData.summary.totalCredit.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Closing Balance</p>
              <p className={`text-2xl font-bold ${ledgerData.summary.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                QAR {Math.abs(ledgerData.summary.closingBalance).toFixed(2)}
              </p>
            </div>
          </div>
          
          {/* Ledger Entries */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voucher #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Narration</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ledgerData.ledgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  ledgerData.ledgerEntries.map((entry: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">{new Date(entry.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {entry.voucherType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">{entry.voucherNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{entry.narration}</td>
                      <td className="px-6 py-4 text-sm text-right text-red-600">
                        {entry.debit > 0 ? `QAR ${entry.debit.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-green-600">
                        {entry.credit > 0 ? `QAR ${entry.credit.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold">
                        QAR {entry.balance.toFixed(2)}
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
  
  // Account List View
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Account Ledgers</h1>
              <p className="text-gray-600 mt-1">{filteredAccounts.length} accounts</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/autocityPro/accounts')}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            <span>Manage Accounts</span>
          </button>
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by account name or code..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            >
              {accountTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading accounts...</p>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No accounts found</p>
            </div>
          ) : (
            filteredAccounts.map((account) => (
              <div
                key={account._id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border-l-4"
                style={{
                  borderLeftColor:
                    account.accountType === 'asset' ? '#10b981' :
                    account.accountType === 'liability' ? '#ef4444' :
                    account.accountType === 'equity' ? '#8b5cf6' :
                    account.accountType === 'revenue' ? '#3b82f6' :
                    '#f59e0b'
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{account.accountName}</h3>
                    <p className="text-sm text-gray-500">{account.accountNumber}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    account.accountType === 'asset' ? 'bg-green-100 text-green-800' :
                    account.accountType === 'liability' ? 'bg-red-100 text-red-800' :
                    account.accountType === 'equity' ? 'bg-purple-100 text-purple-800' :
                    account.accountType === 'revenue' ? 'bg-blue-100 text-blue-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {account.accountType}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Group:</span>
                    <span className="font-medium">{account.accountGroup}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Opening Balance:</span>
                    <span className="font-semibold">QAR {account.openingBalance?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Current Balance:</span>
                    <span className={`font-bold ${account.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      QAR {account.currentBalance?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleViewLedger(account)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  <span>View Ledger</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
