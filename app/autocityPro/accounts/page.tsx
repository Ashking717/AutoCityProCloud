// app/autocityPro/accounts/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Wallet, Search, Plus, Edit2, Trash2, X, Eye, Calculator, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AccountsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [saving, setSaving] = useState(false);

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
    setLoading(true);
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

  const resetForm = () => {
    setFormData({
      accountCode: '',
      accountName: '',
      accountType: 'asset',
      accountSubType: '',
      accountGroup: '',
      openingBalance: 0,
      description: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingAccount ? `/api/accounts/${editingAccount._id}` : '/api/accounts';
      const method = editingAccount ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(editingAccount ? 'Account updated!' : 'Account created!');
        setShowAddModal(false);
        setEditingAccount(null);
        resetForm();
        fetchAccounts();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save account');
      }
    } catch (error) {
      toast.error('Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setFormData({
      accountCode: account.code || account.accountNumber || '',
      accountName: account.name || account.accountName || '',
      accountType: account.type || account.accountType || 'asset',
      accountSubType: account.subType || account.accountSubType || '',
      accountGroup: account.accountGroup || '',
      openingBalance: account.openingBalance || 0,
      description: account.description || '',
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        toast.success('Account deleted!');
        fetchAccounts();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to delete account');
      }
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = 
      (acc.name || acc.accountName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.code || acc.accountNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || (acc.type || acc.accountType) === filterType;
    
    return matchesSearch && matchesType;
  });

  // Group accounts by type for summary
  const accountSummary = accounts.reduce((acc, account) => {
    const type = account.type || account.accountType;
    if (!acc[type]) {
      acc[type] = { count: 0, balance: 0 };
    }
    acc[type].count++;
    acc[type].balance += account.currentBalance || 0;
    return acc;
  }, {} as Record<string, { count: number; balance: number }>);

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <Wallet className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Chart of Accounts</h1>
              <p className="text-gray-600 mt-1">{filteredAccounts.length} accounts</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchAccounts}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              title="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => router.push('/autocityPro/accounts/opening-balance')}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Calculator className="h-5 w-5" />
              <span>Opening Balance</span>
            </button>
            <button
              onClick={() => {
                setEditingAccount(null);
                resetForm();
                setShowAddModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus className="h-5 w-5" />
              <span>Add Account</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {['asset', 'liability', 'equity', 'revenue', 'expense'].map((type) => (
            <div
              key={type}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                filterType === type ? 'ring-2 ring-purple-500' : ''
              } ${
                type === 'asset' ? 'bg-green-50 border-green-200' :
                type === 'liability' ? 'bg-red-50 border-red-200' :
                type === 'equity' ? 'bg-purple-50 border-purple-200' :
                type === 'revenue' ? 'bg-blue-50 border-blue-200' :
                'bg-orange-50 border-orange-200'
              }`}
              onClick={() => setFilterType(filterType === type ? 'all' : type)}
            >
              <p className="text-xs font-medium uppercase text-gray-600">{type}</p>
              <p className="text-lg font-bold mt-1">
                {accountSummary[type]?.count || 0} accounts
              </p>
              <p className="text-sm text-gray-600">
                QAR {(accountSummary[type]?.balance || 0).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search accounts..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              />
            </div>
            {filterType !== 'all' && (
              <button
                onClick={() => setFilterType('all')}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>

        {/* Accounts Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sub Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Group</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Opening</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-purple-600" />
                    Loading accounts...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <Wallet className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No accounts found</p>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => {
                  const accountType = account.type || account.accountType;
                  const accountSubType = account.subType || account.accountSubType;
                  const accountCode = account.code || account.accountNumber;
                  const accountName = account.name || account.accountName;
                  
                  return (
                    <tr key={account._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {accountCode}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {accountName}
                        {account.isSystem && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                            System
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          accountType === 'asset' ? 'bg-green-100 text-green-800' :
                          accountType === 'liability' ? 'bg-red-100 text-red-800' :
                          accountType === 'equity' ? 'bg-purple-100 text-purple-800' :
                          accountType === 'revenue' ? 'bg-blue-100 text-blue-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {accountType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {accountSubTypes[accountType]?.find(st => st.value === accountSubType)?.label || 
                         accountSubType || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {account.accountGroup || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        QAR {(account.openingBalance || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold">
                        <span className={(account.currentBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                          QAR {(account.currentBalance || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => router.push(`/autocityPro/accounts/${account._id}`)}
                            className="text-purple-600 hover:text-purple-900"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(account)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {!account.isSystem && (
                            <button
                              onClick={() => handleDelete(account._id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-bold">
                {editingAccount ? 'Edit Account' : 'Add Account'}
              </h2>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingAccount(null);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Account Code *</label>
                  <input
                    type="text"
                    value={formData.accountCode}
                    onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })}
                    required
                    disabled={editingAccount?.isSystem}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent disabled:bg-gray-100"
                    placeholder="e.g., AST-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Account Name *</label>
                  <input
                    type="text"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    placeholder="e.g., Cash in Hand"
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
                    disabled={editingAccount?.isSystem}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="asset">Asset</option>
                    <option value="liability">Liability</option>
                    <option value="equity">Equity</option>
                    <option value="revenue">Revenue</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Account Sub Type</label>
                  <select
                    value={formData.accountSubType}
                    onChange={(e) => setFormData({ ...formData, accountSubType: e.target.value })}
                    disabled={editingAccount?.isSystem}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent disabled:bg-gray-100"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  >
                    <option value="">Select Group</option>
                    {(accountGroups[formData.accountType] || []).map(group => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Opening Balance
                  {editingAccount && (
                    <span className="text-xs text-gray-500 ml-2">
                      (Updates will create a journal entry)
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  value={formData.openingBalance}
                  onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                  step="0.01"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="Optional description"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingAccount(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingAccount ? 'Update' : 'Create'} Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}