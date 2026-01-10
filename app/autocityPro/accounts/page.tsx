// app/autocityPro/accounts/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Wallet, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Eye, 
  Calculator, 
  RefreshCw,
  Filter,
  MoreVertical,
  ChevronLeft,
  FileDown,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  BarChart3,
  AlertCircle,
  SortAsc,
  SortDesc,
  ChevronRight
} from 'lucide-react';
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
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'accountCode',
    direction: 'asc'
  });

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

    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
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

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' 
      ? <SortAsc className="h-3 w-3 ml-1 text-[#E84545]" /> 
      : <SortDesc className="h-3 w-3 ml-1 text-[#E84545]" />;
  };

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = 
      (acc.name || acc.accountName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.code || acc.accountNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || (acc.type || acc.accountType) === filterType;
    
    return matchesSearch && matchesType;
  });

  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    let aValue = a[sortConfig.key] || a[sortConfig.key === 'accountCode' ? 'code' : 'name'];
    let bValue = b[sortConfig.key] || b[sortConfig.key === 'accountCode' ? 'code' : 'name'];

    if (sortConfig.key === 'openingBalance' || sortConfig.key === 'currentBalance') {
      aValue = a.openingBalance || a.currentBalance || 0;
      bValue = b.openingBalance || b.currentBalance || 0;
    }

    if (sortConfig.direction === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
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

  const downloadAccountsCSV = () => {
    if (filteredAccounts.length === 0) {
      toast.error("No accounts to export");
      return;
    }
    
    const headers = ["Code", "Name", "Type", "Sub Type", "Group", "Opening Balance", "Current Balance"];
    const rows = filteredAccounts.map(acc => [
      acc.code || acc.accountNumber || '',
      acc.name || acc.accountName || '',
      acc.type || acc.accountType || '',
      acc.subType || acc.accountSubType || '',
      acc.accountGroup || '',
      acc.openingBalance || 0,
      acc.currentBalance || 0
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `accounts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredAccounts.length} accounts to CSV`);
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'asset': return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'liability': return <TrendingDown className="h-4 w-4 text-red-400" />;
      case 'revenue': return <DollarSign className="h-4 w-4 text-blue-400" />;
      case 'expense': return <CreditCard className="h-4 w-4 text-orange-400" />;
      case 'equity': return <BarChart3 className="h-4 w-4 text-purple-400" />;
      default: return <Wallet className="h-4 w-4 text-gray-400" />;
    }
  };

  const clearFilters = () => {
    setFilterType("all");
    setSearchTerm("");
    setSortConfig({ key: 'accountCode', direction: 'asc' });
  };

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
                  <span className="text-white text-xs font-semibold">{filteredAccounts.length} accounts</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#E84545] text-xs font-medium">
                    {filterType === 'all' ? 'All Types' : filterType}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-xl font-bold text-white">Accounts</h1>
                <p className="text-xs text-white/60">{filteredAccounts.length} accounts</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(true)}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <Filter className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowMobileMenu(true)}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/70" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search accounts..."
                className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/70 text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg">
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Wallet className="h-8 w-8 text-white" />
                <div>
                  <h1 className="text-3xl font-bold text-white">Chart of Accounts</h1>
                  <p className="text-white/80 mt-1">Manage your account structure</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={downloadAccountsCSV}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all group"
                >
                  <FileDown className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => {
                    setEditingAccount(null);
                    resetForm();
                    setShowAddModal(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] transition-all group"
                >
                  <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" />
                  <span>Add Account</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[180px] md:pt-6 pb-6">
          {/* Desktop Filters with Sort */}
          <div className="hidden md:block bg-black border border-gray-800 rounded-lg shadow p-3 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search accounts..."
                  className="w-full pl-8 pr-3 py-2 text-sm bg-black border border-gray-800 rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-gray-500"
                />
              </div>

              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-black border border-gray-800 rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white appearance-none"
                >
                  <option value="all">All Types</option>
                  <option value="asset">Assets</option>
                  <option value="liability">Liabilities</option>
                  <option value="equity">Equity</option>
                  <option value="revenue">Revenue</option>
                  <option value="expense">Expenses</option>
                </select>
                <div className="absolute right-2 top-2.5 pointer-events-none">
                  <Filter className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="relative">
                <select
                  value={sortConfig.key}
                  onChange={(e) => handleSort(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-black border border-gray-800 rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white appearance-none"
                >
                  <option value="accountCode">Sort by Code</option>
                  <option value="accountName">Sort by Name</option>
                  <option value="openingBalance">Sort by Opening</option>
                  <option value="currentBalance">Sort by Balance</option>
                </select>
                <div className="absolute right-2 top-2.5 pointer-events-none">
                  {sortConfig.direction === 'asc' 
                    ? <SortAsc className="h-4 w-4 text-gray-400" />
                    : <SortDesc className="h-4 w-4 text-gray-400" />
                  }
                </div>
              </div>

              <button
                onClick={() => router.push('/autocityPro/accounts/opening-balance')}
                className="px-4 py-2 text-sm bg-black border border-gray-800 rounded hover:bg-gray-900 hover:border-[#E84545] transition-colors text-white flex items-center justify-center gap-2"
              >
                <Calculator className="h-4 w-4" />
                <span>Opening Balance</span>
              </button>

              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm bg-black border border-gray-800 rounded hover:bg-gray-900 hover:border-[#E84545] transition-colors text-white"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Summary Cards - Mobile */}
          <div className="md:hidden grid grid-cols-2 gap-3 mb-6">
            {['asset', 'liability', 'equity', 'revenue', 'expense'].map((type) => (
              <div
                key={type}
                className={`bg-gradient-to-br from-[#0A0A0A] to-black border ${
                  filterType === type ? 'border-[#E84545]' : 'border-gray-800'
                } rounded-2xl p-4 transition-all active:scale-[0.98]`}
                onClick={() => setFilterType(filterType === type ? 'all' : type)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-black/50 border border-gray-800">
                    {getAccountTypeIcon(type)}
                  </div>
                  <span className={`text-xs font-semibold uppercase ${
                    type === 'asset' ? 'text-green-400' :
                    type === 'liability' ? 'text-red-400' :
                    type === 'equity' ? 'text-purple-400' :
                    type === 'revenue' ? 'text-blue-400' :
                    'text-orange-400'
                  }`}>
                    {type}
                  </span>
                </div>
                <p className="text-lg font-bold text-white">
                  {accountSummary[type]?.count || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  QAR {(accountSummary[type]?.balance || 0).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Summary Cards - Desktop */}
          <div className="hidden md:grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {['asset', 'liability', 'equity', 'revenue', 'expense'].map((type) => (
              <div
                key={type}
                className={`bg-gradient-to-br from-[#0A0A0A] to-black border ${
                  filterType === type ? 'border-[#E84545] ring-2 ring-[#E84545]/20' : 'border-gray-800'
                } rounded-xl p-6 cursor-pointer transition-all hover:border-[#E84545] hover:shadow-lg hover:shadow-red-900/10`}
                onClick={() => setFilterType(filterType === type ? 'all' : type)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-3 rounded-xl ${
                    type === 'asset' ? 'bg-green-900/20 border border-green-800/50' :
                    type === 'liability' ? 'bg-red-900/20 border border-red-800/50' :
                    type === 'equity' ? 'bg-purple-900/20 border border-purple-800/50' :
                    type === 'revenue' ? 'bg-blue-900/20 border border-blue-800/50' :
                    'bg-orange-900/20 border border-orange-800/50'
                  }`}>
                    {getAccountTypeIcon(type)}
                  </div>
                  <span className={`text-sm font-semibold uppercase ${
                    type === 'asset' ? 'text-green-400' :
                    type === 'liability' ? 'text-red-400' :
                    type === 'equity' ? 'text-purple-400' :
                    type === 'revenue' ? 'text-blue-400' :
                    'text-orange-400'
                  }`}>
                    {type}
                  </span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {accountSummary[type]?.count || 0}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  QAR {(accountSummary[type]?.balance || 0).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {/* Accounts List - Mobile */}
          <div className="md:hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E84545]"></div>
              </div>
            ) : sortedAccounts.length === 0 ? (
              <div className="bg-gradient-to-br from-[#0A0A0A] to-black border border-gray-800 rounded-2xl p-8 text-center">
                <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-700" />
                <p className="text-gray-400 text-lg font-medium">No accounts found</p>
                <p className="text-gray-600 text-sm mt-1">Try adjusting your filters</p>
                {(filterType !== 'all' || searchTerm) && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-4 py-2 bg-[#E84545] text-white text-sm font-semibold rounded-lg hover:bg-[#cc3c3c] transition-all active:scale-95"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedAccounts.map((account) => {
                  const accountType = account.type || account.accountType;
                  const accountCode = account.code || account.accountNumber;
                  const accountName = account.name || account.accountName;
                  const currentBalance = account.currentBalance || 0;
                  
                  return (
                    <div
                      key={account._id}
                      className="bg-gradient-to-br from-[#0A0A0A] to-black border border-gray-800 rounded-xl p-4 hover:border-[#E84545] transition-all active:scale-[0.98]"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {getAccountTypeIcon(accountType)}
                            <span className="text-sm font-semibold text-white">{accountCode}</span>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                              accountType === 'asset' ? 'bg-green-900/30 text-green-400 border border-green-800/50' :
                              accountType === 'liability' ? 'bg-red-900/30 text-red-400 border border-red-800/50' :
                              accountType === 'equity' ? 'bg-purple-900/30 text-purple-400 border border-purple-800/50' :
                              accountType === 'revenue' ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50' :
                              'bg-orange-900/30 text-orange-400 border border-orange-800/50'
                            }`}>
                              {accountType}
                            </span>
                          </div>
                          <p className="text-sm text-white truncate">{accountName}</p>
                        </div>
                        <button
                          onClick={() => setShowMobileMenu(true)}
                          className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-3 py-3 border-t border-gray-800">
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase block mb-1">Group</span>
                          <p className="text-sm font-semibold text-gray-300 truncate">{account.accountGroup || '-'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase block mb-1">Opening</span>
                          <p className="text-sm font-semibold text-gray-300">QAR {(account.openingBalance || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase block mb-1">Balance</span>
                          <p className={`text-sm font-bold ${currentBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            QAR {currentBalance.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Accounts Table - Desktop */}
          <div className="hidden md:block bg-black border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-800 text-sm">
              <thead className="bg-[#0A0A0A]">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-900 group"
                    onClick={() => handleSort('accountCode')}
                  >
                    <div className="flex items-center">
                      Code
                      {getSortIcon('accountCode')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-900 group"
                    onClick={() => handleSort('accountName')}
                  >
                    <div className="flex items-center">
                      Account Name
                      {getSortIcon('accountName')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Sub Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Group
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-900 group"
                    onClick={() => handleSort('openingBalance')}
                  >
                    <div className="flex items-center">
                      Opening
                      {getSortIcon('openingBalance')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-900 group"
                    onClick={() => handleSort('currentBalance')}
                  >
                    <div className="flex items-center">
                      Current
                      {getSortIcon('currentBalance')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-black divide-y divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E84545]"></div>
                      </div>
                      <p className="mt-2">Loading accounts...</p>
                    </td>
                  </tr>
                ) : sortedAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                      <Wallet className="h-16 w-16 mx-auto mb-4 text-gray-700" />
                      <p className="text-gray-400 text-lg font-medium">No accounts found</p>
                    </td>
                  </tr>
                ) : (
                  sortedAccounts.map((account) => {
                    const accountType = account.type || account.accountType;
                    const accountSubType = account.subType || account.accountSubType;
                    const accountCode = account.code || account.accountNumber;
                    const accountName = account.name || account.accountName;
                    const currentBalance = account.currentBalance || 0;
                    
                    return (
                      <tr key={account._id} className="hover:bg-gray-900 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-white group-hover:text-red-400">{accountCode}</p>
                            {account.isSystem && (
                              <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-900 rounded">System</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-white group-hover:text-red-400">{accountName}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full capitalize ${
                            accountType === 'asset' ? 'bg-green-900/30 text-green-400 border border-green-800/50 group-hover:border-[#E84545]' :
                            accountType === 'liability' ? 'bg-red-900/30 text-red-400 border border-red-800/50 group-hover:border-[#E84545]' :
                            accountType === 'equity' ? 'bg-purple-900/30 text-purple-400 border border-purple-800/50 group-hover:border-[#E84545]' :
                            accountType === 'revenue' ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50 group-hover:border-[#E84545]' :
                            'bg-orange-900/30 text-orange-400 border border-orange-800/50 group-hover:border-[#E84545]'
                          }`}>
                            {getAccountTypeIcon(accountType)}
                            <span>{accountType}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-300">
                            {accountSubTypes[accountType]?.find(st => st.value === accountSubType)?.label || 
                             accountSubType || '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-300">{account.accountGroup || '-'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-300">QAR {(account.openingBalance || 0).toFixed(2)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className={`text-sm font-semibold ${currentBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            QAR {currentBalance.toFixed(2)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => router.push(`/autocityPro/accounts/${account._id}`)}
                              className="p-2 rounded-lg bg-gray-900 text-gray-400 hover:bg-[#E84545] hover:text-white transition-all group-hover:border border-[#E84545]"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(account)}
                              className="p-2 rounded-lg bg-gray-900 text-gray-400 hover:bg-[#E84545] hover:text-white transition-all group-hover:border border-[#E84545]"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {!account.isSystem && (
                              <button
                                onClick={() => handleDelete(account._id)}
                                className="p-2 rounded-lg bg-gray-900 text-gray-400 hover:bg-[#E84545] hover:text-white transition-all group-hover:border border-[#E84545]"
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

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-6"></div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">
                {editingAccount ? 'Edit Account' : 'Add Account'}
              </h2>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingAccount(null);
                  resetForm();
                }}
                className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Account Code *</label>
                  <input
                    type="text"
                    value={formData.accountCode}
                    onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })}
                    required
                    disabled={editingAccount?.isSystem}
                    className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white disabled:bg-gray-900"
                    placeholder="e.g., AST-001"
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
                    placeholder="e.g., Cash in Hand"
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
                    disabled={editingAccount?.isSystem}
                    className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white disabled:bg-gray-900"
                  >
                    <option value="asset">Asset</option>
                    <option value="liability">Liability</option>
                    <option value="equity">Equity</option>
                    <option value="revenue">Revenue</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Account Sub Type</label>
                  <select
                    value={formData.accountSubType}
                    onChange={(e) => setFormData({ ...formData, accountSubType: e.target.value })}
                    disabled={editingAccount?.isSystem}
                    className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white disabled:bg-gray-900"
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
                <label className="block text-sm font-medium mb-1 text-gray-300">
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
                  className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
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
                  className="px-4 py-2 bg-black border border-gray-800 rounded-lg hover:bg-gray-900 hover:border-[#E84545] transition-colors text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingAccount ? 'Update' : 'Create'} Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Filter Modal */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-black to-[#0A0A0A] rounded-t-3xl border-t border-gray-800 p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Filters & Sort</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Account Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="asset">Assets</option>
                  <option value="liability">Liabilities</option>
                  <option value="equity">Equity</option>
                  <option value="revenue">Revenue</option>
                  <option value="expense">Expenses</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
                <select
                  value={sortConfig.key}
                  onChange={(e) => handleSort(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                >
                  <option value="accountCode">Code (A-Z)</option>
                  <option value="accountName">Name (A-Z)</option>
                  <option value="openingBalance">Opening (High to Low)</option>
                  <option value="currentBalance">Balance (High to Low)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    clearFilters();
                    setShowFilters(false);
                  }}
                  className="flex-1 px-4 py-3 bg-black border border-gray-800 rounded-lg text-gray-300 hover:text-white hover:border-[#E84545] transition-colors active:scale-95"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-lg text-white font-semibold active:scale-95 transition-all hover:shadow-lg hover:shadow-red-900/30"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  setEditingAccount(null);
                  resetForm();
                  setShowAddModal(true);
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-black border border-gray-800 rounded-xl text-gray-300 font-semibold hover:bg-gray-900 hover:border-[#E84545] transition-all flex items-center justify-between active:scale-95"
              >
                <span>Add Account</span>
                <Plus className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  router.push('/autocityPro/accounts/opening-balance');
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-black border border-gray-800 rounded-xl text-gray-300 font-semibold hover:bg-gray-900 hover:border-[#E84545] transition-all flex items-center justify-between active:scale-95"
              >
                <span>Opening Balance</span>
                <Calculator className="h-5 w-5" />
              </button>
              <button
                onClick={downloadAccountsCSV}
                className="w-full p-4 bg-black border border-gray-800 rounded-xl text-gray-300 font-semibold hover:bg-gray-900 hover:border-[#E84545] transition-all flex items-center justify-between active:scale-95"
              >
                <span>Export CSV</span>
                <FileDown className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  fetchAccounts();
                  setShowMobileMenu(false);
                  toast.success('Accounts refreshed');
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