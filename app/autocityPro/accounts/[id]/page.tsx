'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Wallet, ArrowLeft, Edit2, Trash2, Save, X, TrendingUp, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AccountDetailPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id as string;
  
  const [user, setUser] = useState<any>(null);
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    accountCode: '',
    accountName: '',
    accountType: 'asset' as 'asset' | 'liability' | 'equity' | 'revenue' | 'expense',
    accountGroup: '',
    openingBalance: 0,
    description: '',
  });
  
  useEffect(() => {
    fetchUser();
    fetchAccount();
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
    try {
      const res = await fetch(`/api/accounts/${accountId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAccount(data.account);
        setFormData({
          accountCode: data.account.accountNumber,
          accountName: data.account.accountName,
          accountType: data.account.accountType,
          accountGroup: data.account.accountGroup,
          openingBalance: data.account.openingBalance,
          description: data.account.description || '',
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
  
  const handleUpdate = async () => {
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
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  const accountGroups = {
    asset: ['Current Assets', 'Fixed Assets', 'Cash & Bank', 'Investments'],
    liability: ['Current Liabilities', 'Long-term Liabilities', 'Loans'],
    equity: ['Owner Equity', 'Retained Earnings'],
    revenue: ['Sales Revenue', 'Service Revenue', 'Other Income'],
    expense: ['Operating Expenses', 'Administrative Expenses', 'Financial Expenses'],
  };
  
  if (loading) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
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
  
  const balanceChange = account.currentBalance - account.openingBalance;
  
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
                {isEditing ? 'Edit Account' : account.accountName}
              </h1>
              <p className="text-gray-600 mt-1">{account.accountNumber}</p>
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
            </div>
          )}
          
          {isEditing && (
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    accountCode: account.accountNumber,
                    accountName: account.accountName,
                    accountType: account.accountType,
                    accountGroup: account.accountGroup,
                    openingBalance: account.openingBalance,
                    description: account.description || '',
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
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
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Account Name *</label>
                      <input
                        type="text"
                        value={formData.accountName}
                        onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                        required
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Account Type *</label>
                      <select
                        value={formData.accountType}
                        onChange={(e) => setFormData({ ...formData, accountType: e.target.value as any, accountGroup: '' })}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="asset">Asset</option>
                        <option value="liability">Liability</option>
                        <option value="equity">Equity</option>
                        <option value="revenue">Revenue</option>
                        <option value="expense">Expense</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Account Group *</label>
                      <select
                        value={formData.accountGroup}
                        onChange={(e) => setFormData({ ...formData, accountGroup: e.target.value })}
                        required
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">Select Group</option>
                        {accountGroups[formData.accountType].map(group => (
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
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border rounded-lg"
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
                      <p className="text-lg font-semibold text-gray-900">{account.accountNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Account Type</label>
                      <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${
                        account.accountType === 'asset' ? 'bg-green-100 text-green-800' :
                        account.accountType === 'liability' ? 'bg-red-100 text-red-800' :
                        account.accountType === 'equity' ? 'bg-purple-100 text-purple-800' :
                        account.accountType === 'revenue' ? 'bg-blue-100 text-blue-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {account.accountType}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600">Account Group</label>
                    <p className="text-lg font-semibold text-gray-900">{account.accountGroup}</p>
                  </div>
                  
                  {account.description && (
                    <div>
                      <label className="text-sm text-gray-600">Description</label>
                      <p className="text-gray-900">{account.description}</p>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t">
                    <label className="text-sm text-gray-600">Created</label>
                    <p className="text-gray-900">
                      {new Date(account.createdAt).toLocaleDateString()} at {new Date(account.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
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
                    QAR {account.openingBalance?.toFixed(2) || '0.00'}
                  </p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <label className="text-sm text-blue-600">Current Balance</label>
                  <p className={`text-3xl font-bold ${account.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    QAR {account.currentBalance?.toFixed(2) || '0.00'}
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
                  <p className={`text-xl font-bold ${balanceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}