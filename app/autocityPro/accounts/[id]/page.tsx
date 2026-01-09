// File: app/autocityPro/accounts/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Wallet, ArrowLeft, Edit2, Trash2, Save, X, 
  TrendingUp, TrendingDown, RefreshCw, FileText 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AccountDetailPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id as string;
  
  const [user, setUser] = useState<any>(null);
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    accountCode: '',
    accountName: '',
    accountType: 'asset' as 'asset' | 'liability' | 'equity' | 'revenue' | 'expense',
    accountSubType: '',
    accountGroup: '',
    openingBalance: 0,
    description: '',
  });

  const accountGroups: Record<string, string[]> = {
    asset: ['Current Assets', 'Fixed Assets', 'Cash & Bank', 'Investments'],
    liability: ['Current Liabilities', 'Long-term Liabilities', 'Loans'],
    equity: ['Owner Equity', 'Retained Earnings'],
    revenue: ['Sales Revenue', 'Service Revenue', 'Other Income'],
    expense: ['Operating Expenses', 'Administrative Expenses', 'Financial Expenses'],
  };

  const accountSubTypes: Record<string, { value: string; label: string }[]> = {
    asset: [
      { value: 'cash', label: 'Cash' },
      { value: 'bank', label: 'Bank' },
      { value: 'accounts_receivable', label: 'Accounts Receivable' },
      { value: 'inventory', label: 'Inventory' },
      { value: 'fixed_asset', label: 'Fixed Asset' },
      { value: 'vat_receivable', label: 'VAT Receivable' },
    ],
    liability: [
      { value: 'accounts_payable', label: 'Accounts Payable' },
      { value: 'loan', label: 'Loan' },
      { value: 'vat_payable', label: 'VAT Payable' },
    ],
    equity: [
      { value: 'owner_equity', label: 'Owner Equity' },
      { value: 'retained_earnings', label: 'Retained Earnings' },
    ],
    revenue: [
      { value: 'sales_revenue', label: 'Sales Revenue' },
      { value: 'service_revenue', label: 'Service Revenue' },
      { value: 'sales_returns', label: 'Sales Returns' },
    ],
    expense: [
      { value: 'cogs', label: 'Cost of Goods Sold' },
      { value: 'operating_expense', label: 'Operating Expense' },
      { value: 'administrative_expense', label: 'Administrative Expense' },
    ],
  };
  
  useEffect(() => {
    fetchUser();
    fetchAccount();
    fetchRecentTransactions();
  }, [accountId]);
  
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
  
  const fetchAccount = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const acc = data.account;
        setAccount(acc);
        
        // Handle both old and new field names
        setFormData({
          accountCode: acc.code || acc.accountNumber || '',
          accountName: acc.name || acc.accountName || '',
          accountType: acc.type || acc.accountType || 'asset',
          accountSubType: acc.subType || acc.accountSubType || '',
          accountGroup: acc.accountGroup || '',
          openingBalance: acc.openingBalance || 0,
          description: acc.description || '',
        });
      } else {
        toast.error('Account not found');
        router.push('/autocityPro/accounts');
      }
    } catch (error) {
      console.error('Failed to fetch account');
      toast.error('Failed to fetch account');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentTransactions = async () => {
    try {
      const res = await fetch(`/api/ledger-entries?accountId=${accountId}&limit=5`, { 
        credentials: 'include' 
      });
      if (res.ok) {
        const data = await res.json();
        setRecentTransactions(data.entries || []);
      }
    } catch (error) {
      console.error('Failed to fetch recent transactions');
    }
  };
  
  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        toast.success('Account updated successfully!');
        setIsEditing(false);
        fetchAccount();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update account');
      }
    } catch (error) {
      toast.error('Failed to update account');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (res.ok) {
        toast.success('Account deleted successfully!');
        router.push('/autocityPro/accounts');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to delete account');
      }
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    // Reset form to current account values
    if (account) {
      setFormData({
        accountCode: account.code || account.accountNumber || '',
        accountName: account.name || account.accountName || '',
        accountType: account.type || account.accountType || 'asset',
        accountSubType: account.subType || account.accountSubType || '',
        accountGroup: account.accountGroup || '',
        openingBalance: account.openingBalance || 0,
        description: account.description || '',
      });
    }
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  if (loading) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="h-16 w-16 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading account...</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  if (!account) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="p-8">
          <div className="text-center py-12">
            <Wallet className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Not Found</h2>
            <button
              onClick={() => router.push('/autocityPro/accounts')}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Back to Accounts
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Handle both old and new field names for display
  const accountType = account.type || account.accountType;
  const accountSubType = account.subType || account.accountSubType;
  const accountCode = account.code || account.accountNumber;
  const accountName = account.name || account.accountName;
  const balanceChange = (account.currentBalance || 0) - (account.openingBalance || 0);
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push('/autocityPro/accounts')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <Wallet className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditing ? 'Edit Account' : accountName}
              </h1>
              <p className="text-gray-600 mt-1">{accountCode}</p>
            </div>
          </div>
          
          {!isEditing && (
            <div className="flex space-x-2">
              <button
                onClick={() => router.push(`/autocityPro/ledgers?account=${accountId}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                View Ledger
              </button>
              {!account.isSystem && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </>
              )}
            </div>
          )}
          
          {isEditing && (
            <div className="flex space-x-2">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {isEditing ? (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Account Information</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Account Code *</label>
                      <input
                        type="text"
                        value={formData.accountCode}
                        onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })}
                        required
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Account Name *</label>
                      <input
                        type="text"
                        value={formData.accountName}
                        onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                        required
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Account Type *</label>
                      <select
                        value={formData.accountType}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          accountType: e.target.value as any, 
                          accountSubType: '',
                          accountGroup: '' 
                        })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600"
                      >
                        <option value="asset">Asset</option>
                        <option value="liability">Liability</option>
                        <option value="equity">Equity</option>
                        <option value="revenue">Revenue</option>
                        <option value="expense">Expense</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Sub Type</label>
                      <select
                        value={formData.accountSubType}
                        onChange={(e) => setFormData({ ...formData, accountSubType: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600"
                      >
                        <option value="">Select Sub Type</option>
                        {(accountSubTypes[formData.accountType] || []).map(st => (
                          <option key={st.value} value={st.value}>
                            {st.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Account Group *</label>
                      <select
                        value={formData.accountGroup}
                        onChange={(e) => setFormData({ ...formData, accountGroup: e.target.value })}
                        required
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600"
                      >
                        <option value="">Select Group</option>
                        {(accountGroups[formData.accountType] || []).map(group => (
                          <option key={group} value={group}>{group}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Opening Balance</label>
                    <input
                      type="number"
                      value={formData.openingBalance}
                      onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                      step="0.01"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600"
                      placeholder="Optional description"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Account Information</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm text-gray-600">Account Number</label>
                      <p className="text-lg font-semibold text-gray-900">{accountCode}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Account Type</label>
                      <div className="mt-1">
                        <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${
                          accountType === 'asset' ? 'bg-green-100 text-green-800' :
                          accountType === 'liability' ? 'bg-red-100 text-red-800' :
                          accountType === 'equity' ? 'bg-purple-100 text-purple-800' :
                          accountType === 'revenue' ? 'bg-blue-100 text-blue-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {accountType}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm text-gray-600">Sub Type</label>
                      <p className="text-lg font-semibold text-gray-900">
                        {accountSubTypes[accountType]?.find(st => st.value === accountSubType)?.label || 
                         accountSubType || '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Account Group</label>
                      <p className="text-lg font-semibold text-gray-900">
                        {account.accountGroup || '-'}
                      </p>
                    </div>
                  </div>
                  
                  {account.description && (
                    <div>
                      <label className="text-sm text-gray-600">Description</label>
                      <p className="text-gray-900">{account.description}</p>
                    </div>
                  )}

                  {account.isSystem && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>System Account:</strong> This account is managed by the system and cannot be deleted.
                      </p>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t">
                    <label className="text-sm text-gray-600">Created</label>
                    <p className="text-gray-900">
                      {new Date(account.createdAt).toLocaleDateString()} at{' '}
                      {new Date(account.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            {!isEditing && recentTransactions.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Recent Transactions</h2>
                  <button
                    onClick={() => router.push(`/autocityPro/ledgers?account=${accountId}`)}
                    className="text-sm text-purple-600 hover:text-purple-800"
                  >
                    View All →
                  </button>
                </div>
                <div className="space-y-3">
                  {recentTransactions.map((entry) => (
                    <div 
                      key={entry._id} 
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{entry.narration}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(entry.date).toLocaleDateString()} • {entry.voucherNumber}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {entry.debit > 0 && (
                          <p className="font-semibold text-green-600">
                            DR: QAR {entry.debit.toFixed(2)}
                          </p>
                        )}
                        {entry.credit > 0 && (
                          <p className="font-semibold text-red-600">
                            CR: QAR {entry.credit.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Balance Information */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Balance Summary</h2>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="text-sm text-gray-600">Opening Balance</label>
                  <p className="text-2xl font-bold text-gray-900">
                    QAR {(account.openingBalance || 0).toFixed(2)}
                  </p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <label className="text-sm text-blue-600">Current Balance</label>
                  <p className={`text-3xl font-bold ${
                    (account.currentBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    QAR {(account.currentBalance || 0).toFixed(2)}
                  </p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-600">Change</label>
                    {balanceChange !== 0 && (
                      balanceChange > 0 ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      )
                    )}
                  </div>
                  <p className={`text-xl font-bold ${
                    balanceChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {balanceChange >= 0 ? '+' : ''}QAR {balanceChange.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {balanceChange >= 0 ? 'Increase' : 'Decrease'} from opening balance
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <button
                  onClick={() => router.push(`/autocityPro/ledgers?account=${accountId}`)}
                  className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-left"
                >
                  View Full Ledger
                </button>
                <button
                  onClick={() => router.push('/autocityPro/vouchers/journal')}
                  className="w-full px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 text-left"
                >
                  Create Journal Entry
                </button>
                <button
                  onClick={() => router.push('/autocityPro/reports/balance-sheet')}
                  className="w-full px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-left"
                >
                  View in Balance Sheet
                </button>
                <button
                  onClick={() => router.push('/autocityPro/reports/trial-balance')}
                  className="w-full px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 text-left"
                >
                  View Trial Balance
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}