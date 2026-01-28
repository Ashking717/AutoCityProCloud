'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Wallet, 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  FileText,
  Eye,
  FileDown,
  Calculator,
  BarChart3,
  Receipt,
  Plus,
  MoreVertical,
  ChevronLeft,
  Filter,
  Calendar,
  Download,
  AlertCircle,
  History
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
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  
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

    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
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

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'asset': return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'liability': return <TrendingDown className="h-4 w-4 text-red-400" />;
      case 'revenue': return <Calculator className="h-4 w-4 text-blue-400" />;
      case 'expense': return <Receipt className="h-4 w-4 text-orange-400" />;
      case 'equity': return <BarChart3 className="h-4 w-4 text-purple-400" />;
      default: return <Wallet className="h-4 w-4 text-gray-400" />;
    }
  };

  const downloadAccountCSV = () => {
    if (!account || recentTransactions.length === 0) {
      toast.error("No transaction data to export");
      return;
    }
    
    const headers = ["Date", "Voucher #", "Type", "Narration", "Debit", "Credit", "Balance"];
    const rows = recentTransactions.map(entry => [
      new Date(entry.date).toLocaleDateString(),
      entry.voucherNumber || '',
      entry.voucherType || '',
      entry.narration || '',
      entry.debit || 0,
      entry.credit || 0,
      entry.balance || 0
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `account_${account.code || account.accountNumber}_transactions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${recentTransactions.length} transactions to CSV`);
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };
  
  if (loading) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-16 w-16 animate-spin text-[#E84545] mx-auto mb-4" />
            <p className="text-gray-400">Loading account...</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  if (!account) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="min-h-screen bg-[#050505]">
          <div className="text-center py-12">
            <Wallet className="h-16 w-16 mx-auto mb-4 text-gray-700" />
            <h2 className="text-2xl font-bold text-white mb-2">Account Not Found</h2>
            <button
              onClick={() => router.push('/autocityPro/accounts')}
              className="mt-4 px-4 py-2 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c]"
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
      <div className="min-h-screen bg-[#050505]">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">{accountCode}</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1.5">
                  {getAccountTypeIcon(accountType)}
                  <span className="text-[#E84545] text-xs font-medium capitalize">{accountType}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/autocityPro/accounts')}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">{accountName.substring(0, 20)}</h1>
                  <p className="text-xs text-white/60">{accountCode}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && !account.isSystem && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowMobileMenu(true)}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg">
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/autocityPro/accounts')}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                >
                  <ArrowLeft className="h-5 w-5 text-white" />
                </button>
                <div className="flex items-center space-x-3">
                  <Wallet className="h-8 w-8 text-white" />
                  <div>
                    <h1 className="text-3xl font-bold text-white">
                      {isEditing ? 'Edit Account' : accountName}
                    </h1>
                    <p className="text-white/80 mt-1">{accountCode} • {accountType}</p>
                  </div>
                </div>
              </div>
              
              {!isEditing && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => router.push(`/autocityPro/ledgers?account=${accountId}`)}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all group"
                  >
                    <Eye className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span>View Ledger</span>
                  </button>
                  {!account.isSystem && (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all group"
                      >
                        <Edit2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex items-center space-x-2 px-4 py-2.5 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] transition-all group"
                      >
                        <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>
              )}
              
              {isEditing && (
                <div className="flex space-x-3">
                  <button
                    onClick={cancelEdit}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all group"
                  >
                    <X className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleUpdate}
                    disabled={saving}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] transition-all group disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[180px] md:pt-6 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Details */}
            <div className="lg:col-span-2 space-y-6">
              {isEditing ? (
                <div className="bg-black border border-gray-800 rounded-2xl shadow-xl p-6">
                  <h2 className="text-xl font-bold mb-4 text-white">Account Information</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Account Code *</label>
                        <input
                          type="text"
                          value={formData.accountCode}
                          onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })}
                          required
                          className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Account Name *</label>
                        <input
                          type="text"
                          value={formData.accountName}
                          onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                          required
                          className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Account Type *</label>
                        <select
                          value={formData.accountType}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            accountType: e.target.value as any, 
                            accountSubType: '',
                            accountGroup: '' 
                          })}
                          className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                        >
                          <option value="asset">Asset</option>
                          <option value="liability">Liability</option>
                          <option value="equity">Equity</option>
                          <option value="revenue">Revenue</option>
                          <option value="expense">Expense</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Sub Type</label>
                        <select
                          value={formData.accountSubType}
                          onChange={(e) => setFormData({ ...formData, accountSubType: e.target.value })}
                          className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
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
                        <label className="block text-sm font-medium mb-1 text-gray-300">Account Group *</label>
                        <select
                          value={formData.accountGroup}
                          onChange={(e) => setFormData({ ...formData, accountGroup: e.target.value })}
                          required
                          className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                        >
                          <option value="">Select Group</option>
                          {(accountGroups[formData.accountType] || []).map(group => (
                            <option key={group} value={group}>{group}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Opening Balance</label>
                      <input
                        type="number"
                        value={formData.openingBalance}
                        onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                        step="0.01"
                        className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                        placeholder="Optional description"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-black border border-gray-800 rounded-2xl shadow-xl p-6">
                  <h2 className="text-xl font-bold mb-4 text-white">Account Information</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm text-gray-500">Account Number</label>
                        <p className="text-lg font-semibold text-white">{accountCode}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Account Type</label>
                        <div className="mt-1">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full ${
                            accountType === 'asset' ? 'bg-green-900/30 text-green-400 border border-green-800/50' :
                            accountType === 'liability' ? 'bg-red-900/30 text-red-400 border border-red-800/50' :
                            accountType === 'equity' ? 'bg-purple-900/30 text-purple-400 border border-purple-800/50' :
                            accountType === 'revenue' ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50' :
                            'bg-orange-900/30 text-orange-400 border border-orange-800/50'
                          }`}>
                            {getAccountTypeIcon(accountType)}
                            <span className="capitalize">{accountType}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm text-gray-500">Sub Type</label>
                        <p className="text-lg font-semibold text-white">
                          {accountSubTypes[accountType]?.find(st => st.value === accountSubType)?.label || 
                           accountSubType || '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Account Group</label>
                        <p className="text-lg font-semibold text-white">
                          {account.accountGroup || '-'}
                        </p>
                      </div>
                    </div>
                    
                    {account.description && (
                      <div>
                        <label className="text-sm text-gray-500">Description</label>
                        <p className="text-gray-300">{account.description}</p>
                      </div>
                    )}

                    {account.isSystem && (
                      <div className="p-3 bg-yellow-900/20 border border-yellow-800/50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-yellow-400">
                            <strong>System Account:</strong> This account is managed by the system and cannot be deleted.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-4 border-t border-gray-800">
                      <label className="text-sm text-gray-500">Created</label>
                      <p className="text-gray-300">
                        {new Date(account.createdAt).toLocaleDateString()} at{' '}
                        {new Date(account.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Transactions */}
              {!isEditing && recentTransactions.length > 0 && (
                <div className="bg-black border border-gray-800 rounded-2xl shadow-xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
                    <button
                      onClick={() => router.push(`/autocityPro/ledgers?account=${accountId}`)}
                      className="text-sm text-[#E84545] hover:text-[#cc3c3c] flex items-center gap-1"
                    >
                      <span>View All</span>
                      <History className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {recentTransactions.map((entry) => (
                      <div 
                        key={entry._id} 
                        className="flex justify-between items-center p-4 bg-gradient-to-br from-[#0A0A0A] to-black border border-gray-800 rounded-xl hover:border-[#E84545] transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            entry.debit > 0 ? 'bg-green-900/20 border border-green-800/50' : 
                            'bg-red-900/20 border border-red-800/50'
                          }`}>
                            <FileText className="h-4 w-4 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{entry.narration}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(entry.date).toLocaleDateString()} • {entry.voucherNumber}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {entry.debit > 0 && (
                            <p className="font-semibold text-green-400">
                              DR: QAR {entry.debit.toFixed(2)}
                            </p>
                          )}
                          {entry.credit > 0 && (
                            <p className="font-semibold text-red-400">
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
              <div className="bg-black border border-gray-800 rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold mb-4 text-white">Balance Summary</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-[#0A0A0A] to-black border border-gray-800 rounded-xl">
                    <label className="text-sm text-gray-500">Opening Balance</label>
                    <p className="text-2xl font-bold text-white">
                      QAR {(account.openingBalance || 0).toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-[#0A0A0A] to-black border border-gray-800 rounded-xl hover:border-[#E84545] transition-colors">
                    <label className="text-sm text-gray-500">Current Balance</label>
                    <p className={`text-3xl font-bold ${
                      (account.currentBalance || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      QAR {(account.currentBalance || 0).toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-[#0A0A0A] to-black border border-gray-800 rounded-xl">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-500">Change</label>
                      {balanceChange !== 0 && (
                        balanceChange > 0 ? (
                          <TrendingUp className="h-5 w-5 text-green-400" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-400" />
                        )
                      )}
                    </div>
                    <p className={`text-xl font-bold ${
                      balanceChange >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {balanceChange >= 0 ? '+' : ''}QAR {Math.abs(balanceChange).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {balanceChange >= 0 ? 'Increase' : 'Decrease'} from opening balance
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-black border border-gray-800 rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold mb-4 text-white">Quick Actions</h2>
                <div className="space-y-2">
                  <button
                    onClick={() => router.push(`/autocityPro/ledgers?account=${accountId}`)}
                    className="w-full px-4 py-3 bg-gradient-to-br from-[#0A0A0A] to-black border border-gray-800 rounded-lg hover:border-[#E84545] text-left text-white transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-gray-400 group-hover:text-[#E84545]" />
                      <span>View Full Ledger</span>
                    </div>
                    <History className="h-4 w-4 text-gray-500 group-hover:text-[#E84545]" />
                  </button>
                  <button
                    onClick={() => router.push('/autocityPro/vouchers/journal')}
                    className="w-full px-4 py-3 bg-gradient-to-br from-[#0A0A0A] to-black border border-gray-800 rounded-lg hover:border-[#E84545] text-left text-white transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-gray-400 group-hover:text-[#E84545]" />
                      <span>Create Journal Entry</span>
                    </div>
                    <FileText className="h-4 w-4 text-gray-500 group-hover:text-[#E84545]" />
                  </button>
                  <button
                    onClick={() => router.push('/autocityPro/reports/balance-sheet')}
                    className="w-full px-4 py-3 bg-gradient-to-br from-[#0A0A0A] to-black border border-gray-800 rounded-lg hover:border-[#E84545] text-left text-white transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-gray-400 group-hover:text-[#E84545]" />
                      <span>View in Balance Sheet</span>
                    </div>
                    <Calculator className="h-4 w-4 text-gray-500 group-hover:text-[#E84545]" />
                  </button>
                  <button
                    onClick={() => router.push('/autocityPro/reports/trial-balance')}
                    className="w-full px-4 py-3 bg-gradient-to-br from-[#0A0A0A] to-black border border-gray-800 rounded-lg hover:border-[#E84545] text-left text-white transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-gray-400 group-hover:text-[#E84545]" />
                      <span>View Trial Balance</span>
                    </div>
                    <Calculator className="h-4 w-4 text-gray-500 group-hover:text-[#E84545]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-24"></div>
      </div>

      {/* Mobile Action Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-black to-[#0A0A0A] rounded-t-3xl border-t border-gray-800 p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Actions</h2>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  router.push(`/autocityPro/ledgers?account=${accountId}`);
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-black border border-gray-800 rounded-xl text-gray-300 font-semibold hover:bg-gray-900 hover:border-[#E84545] transition-all flex items-center justify-between active:scale-95"
              >
                <span>View Ledger</span>
                <Eye className="h-5 w-5" />
              </button>
              {!account.isSystem && (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMobileMenu(false);
                    }}
                    className="w-full p-4 bg-black border border-gray-800 rounded-xl text-gray-300 font-semibold hover:bg-gray-900 hover:border-[#E84545] transition-all flex items-center justify-between active:scale-95"
                  >
                    <span>Edit Account</span>
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      handleDelete();
                      setShowMobileMenu(false);
                    }}
                    className="w-full p-4 bg-black border border-gray-800 rounded-xl text-red-400 font-semibold hover:bg-red-900/20 hover:border-red-800 transition-all flex items-center justify-between active:scale-95"
                  >
                    <span>Delete Account</span>
                    <Trash2 className="h-5 w-5" />
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  router.push('/autocityPro/vouchers/journal');
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-black border border-gray-800 rounded-xl text-gray-300 font-semibold hover:bg-gray-900 hover:border-[#E84545] transition-all flex items-center justify-between active:scale-95"
              >
                <span>Create Journal Entry</span>
                <Plus className="h-5 w-5" />
              </button>
              <button
                onClick={downloadAccountCSV}
                className="w-full p-4 bg-black border border-gray-800 rounded-xl text-gray-300 font-semibold hover:bg-gray-900 hover:border-[#E84545] transition-all flex items-center justify-between active:scale-95"
              >
                <span>Export Transactions</span>
                <FileDown className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  fetchAccount();
                  fetchRecentTransactions();
                  setShowMobileMenu(false);
                  toast.success('Account refreshed');
                }}
                className="w-full p-4 bg-black border border-gray-800 rounded-xl text-gray-300 font-semibold hover:bg-gray-900 hover:border-[#E84545] transition-all flex items-center justify-between active:scale-95"
              >
                <span>Refresh Data</span>
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}