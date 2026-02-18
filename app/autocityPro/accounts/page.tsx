'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import {
  Wallet, Search, Plus, Edit2, Trash2, X, Eye, Calculator, RefreshCw,
  Filter, MoreVertical, FileDown, TrendingUp, TrendingDown,
  DollarSign, CreditCard, BarChart3, AlertCircle, SortAsc, SortDesc,
  Sun, Moon,
} from 'lucide-react';
import toast from 'react-hot-toast';

function useTimeBasedTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => { const h = new Date().getHours(); setIsDark(h < 6 || h >= 18); };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);
  return isDark;
}

export default function AccountsPage() {
  const router = useRouter();
  const isDark = useTimeBasedTheme();

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
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'accountCode', direction: 'asc' });

  const [formData, setFormData] = useState({
    accountCode: '', accountName: '',
    accountType: 'asset' as 'asset' | 'liability' | 'equity' | 'revenue' | 'expense',
    accountSubType: '', accountGroup: '', openingBalance: 0, description: '',
  });

  // ── Theme tokens ────────────────────────────────────────────────────────────
  const th = {
    pageBg:             isDark ? '#050505'                                              : '#f3f4f6',
    headerBgFrom:       isDark ? '#932222'                                              : '#fef2f2',
    headerBgVia:        isDark ? '#411010'                                              : '#fee2e2',
    headerBgTo:         isDark ? '#a20c0c'                                              : '#fecaca',
    headerBorder:       isDark ? 'rgba(255,255,255,0.05)'                               : 'rgba(0,0,0,0.06)',
    headerTitle:        isDark ? '#ffffff'                                              : '#7f1d1d',
    headerSub:          isDark ? 'rgba(255,255,255,0.80)'                               : '#991b1b',
    headerBtnBg:        isDark ? 'rgba(255,255,255,0.10)'                               : 'rgba(127,29,29,0.10)',
    headerBtnBorder:    isDark ? 'rgba(255,255,255,0.20)'                               : 'rgba(127,29,29,0.20)',
    headerBtnText:      isDark ? '#ffffff'                                              : '#7f1d1d',
    mobileHeaderBg:     isDark ? 'linear-gradient(135deg,#0A0A0A,#050505,#0A0A0A)'     : 'linear-gradient(135deg,#ffffff,#f9fafb,#ffffff)',
    mobileHeaderBorder: isDark ? 'rgba(255,255,255,0.05)'                               : 'rgba(0,0,0,0.08)',
    mobileHeaderTitle:  isDark ? '#ffffff'                                              : '#111827',
    mobileHeaderSub:    isDark ? 'rgba(255,255,255,0.60)'                               : '#6b7280',
    mobileBtnBg:        isDark ? 'rgba(255,255,255,0.05)'                               : 'rgba(0,0,0,0.05)',
    mobileBtnText:      isDark ? 'rgba(255,255,255,0.80)'                               : '#374151',
    mobileSearchBg:     isDark ? 'rgba(255,255,255,0.10)'                               : '#ffffff',
    mobileSearchBorder: isDark ? 'rgba(255,255,255,0.20)'                               : 'rgba(0,0,0,0.12)',
    mobileSearchText:   isDark ? '#ffffff'                                              : '#111827',
    filterPanelBg:      isDark ? '#0A0A0A'                                              : '#ffffff',
    filterPanelBorder:  isDark ? 'rgba(255,255,255,0.05)'                               : 'rgba(0,0,0,0.08)',
    filterInputBg:      isDark ? '#111111'                                              : '#ffffff',
    filterInputBorder:  isDark ? 'rgba(255,255,255,0.08)'                               : 'rgba(0,0,0,0.10)',
    filterInputText:    isDark ? '#ffffff'                                              : '#111827',
    filterIcon:         isDark ? '#6b7280'                                              : '#9ca3af',
    cardBg:             isDark ? '#0A0A0A'                                              : '#ffffff',
    cardBorder:         isDark ? 'rgba(255,255,255,0.05)'                               : 'rgba(0,0,0,0.08)',
    cardHoverBorder:    isDark ? 'rgba(232,69,69,0.40)'                                 : 'rgba(232,69,69,0.40)',
    cardTitle:          isDark ? '#ffffff'                                              : '#111827',
    cardSubtext:        isDark ? '#9ca3af'                                              : '#6b7280',
    cardMuted:          isDark ? '#6b7280'                                              : '#9ca3af',
    innerBg:            isDark ? '#111111'                                              : '#f9fafb',
    innerBorder:        isDark ? 'rgba(255,255,255,0.06)'                               : 'rgba(0,0,0,0.08)',
    tableHeaderBg:      isDark ? '#111111'                                              : '#f9fafb',
    tableHeaderText:    isDark ? '#9ca3af'                                              : '#6b7280',
    tableRowHover:      isDark ? 'rgba(255,255,255,0.02)'                               : 'rgba(0,0,0,0.02)',
    tableBorder:        isDark ? 'rgba(255,255,255,0.04)'                               : 'rgba(0,0,0,0.06)',
    actionBtnBg:        isDark ? '#111111'                                              : '#f3f4f6',
    actionBtnBorder:    isDark ? 'rgba(255,255,255,0.08)'                               : 'rgba(0,0,0,0.08)',
    actionBtnText:      isDark ? '#9ca3af'                                              : '#6b7280',
    emptyIcon:          isDark ? '#374151'                                              : '#d1d5db',
    emptyText:          isDark ? '#9ca3af'                                              : '#6b7280',
    modalBg:            isDark ? 'linear-gradient(180deg,#0A0A0A,#050505)'             : 'linear-gradient(180deg,#ffffff,#f9fafb)',
    modalBorder:        isDark ? 'rgba(255,255,255,0.10)'                               : 'rgba(0,0,0,0.08)',
    modalTitle:         isDark ? '#ffffff'                                              : '#111827',
    modalCloseBg:       isDark ? 'rgba(255,255,255,0.05)'                               : 'rgba(0,0,0,0.05)',
    modalCloseText:     isDark ? '#9ca3af'                                              : '#6b7280',
    modalInputBg:       isDark ? '#000000'                                              : '#ffffff',
    modalInputBorder:   isDark ? 'rgba(255,255,255,0.10)'                               : 'rgba(0,0,0,0.15)',
    modalInputText:     isDark ? '#ffffff'                                              : '#111827',
    modalLabel:         isDark ? '#d1d5db'                                              : '#374151',
    summaryBorder:      isDark ? 'rgba(255,255,255,0.06)'                               : 'rgba(0,0,0,0.08)',
  };

  const selectStyle = { background: th.filterInputBg, border: `1px solid ${th.filterInputBorder}`, color: th.filterInputText };
  const modalInputStyle = { background: th.modalInputBg, border: `1px solid ${th.modalInputBorder}`, color: th.modalInputText };

  const accountGroups: Record<string, string[]> = {
    asset:     ['Current Assets', 'Fixed Assets', 'Cash & Bank', 'Investments'],
    liability: ['Current Liabilities', 'Long-term Liabilities', 'Loans'],
    equity:    ['Owner Equity', 'Retained Earnings'],
    revenue:   ['Sales Revenue', 'Service Revenue', 'Other Income'],
    expense:   ['Operating Expenses', 'Administrative Expenses', 'Financial Expenses'],
  };

  const accountSubTypes: Record<string, { value: string; label: string }[]> = {
    asset:     [{ value: 'cash', label: 'Cash' }, { value: 'bank', label: 'Bank' }, { value: 'accounts_receivable', label: 'Accounts Receivable' }, { value: 'inventory', label: 'Inventory' }, { value: 'fixed_asset', label: 'Fixed Asset' }, { value: 'vat_receivable', label: 'VAT Receivable' }],
    liability: [{ value: 'accounts_payable', label: 'Accounts Payable' }, { value: 'loan', label: 'Loan' }, { value: 'vat_payable', label: 'VAT Payable' }],
    equity:    [{ value: 'owner_equity', label: 'Owner Equity' }, { value: 'retained_earnings', label: 'Retained Earnings' }],
    revenue:   [{ value: 'sales_revenue', label: 'Sales Revenue' }, { value: 'service_revenue', label: 'Service Revenue' }, { value: 'sales_returns', label: 'Sales Returns' }],
    expense:   [{ value: 'cogs', label: 'Cost of Goods Sold' }, { value: 'operating_expense', label: 'Operating Expense' }, { value: 'administrative_expense', label: 'Administrative Expense' }],
  };

  useEffect(() => {
    fetchUser(); fetchAccounts();
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const fetchUser = async () => {
    try { const r = await fetch('/api/auth/me', { credentials: 'include' }); if (r.ok) { const d = await r.json(); setUser(d.user); } } catch {}
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/accounts', { credentials: 'include' });
      if (r.ok) { const d = await r.json(); setAccounts(d.accounts || []); }
    } catch { toast.error('Failed to fetch accounts'); }
    finally { setLoading(false); }
  };

  const resetForm = () => setFormData({ accountCode: '', accountName: '', accountType: 'asset', accountSubType: '', accountGroup: '', openingBalance: 0, description: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const url = editingAccount ? `/api/accounts/${editingAccount._id}` : '/api/accounts';
      const r = await fetch(url, { method: editingAccount ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(formData) });
      if (r.ok) { toast.success(editingAccount ? 'Account updated!' : 'Account created!'); setShowAddModal(false); setEditingAccount(null); resetForm(); fetchAccounts(); }
      else { const e = await r.json(); toast.error(e.error || 'Failed to save account'); }
    } catch { toast.error('Failed to save account'); }
    finally { setSaving(false); }
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setFormData({ accountCode: account.code || account.accountNumber || '', accountName: account.name || account.accountName || '', accountType: account.type || account.accountType || 'asset', accountSubType: account.subType || account.accountSubType || '', accountGroup: account.accountGroup || '', openingBalance: account.openingBalance || 0, description: account.description || '' });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    try {
      const r = await fetch(`/api/accounts/${id}`, { method: 'DELETE', credentials: 'include' });
      if (r.ok) { toast.success('Account deleted!'); fetchAccounts(); }
      else { const e = await r.json(); toast.error(e.error || 'Failed to delete account'); }
    } catch { toast.error('Failed to delete account'); }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };

  const handleSort = (key: string) => setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  const getSortIcon = (key: string) => sortConfig.key !== key ? null : sortConfig.direction === 'asc' ? <SortAsc className="h-3 w-3 ml-1 text-[#E84545]" /> : <SortDesc className="h-3 w-3 ml-1 text-[#E84545]" />;

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = (acc.name || acc.accountName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (acc.code || acc.accountNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && (filterType === 'all' || (acc.type || acc.accountType) === filterType);
  });

  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    let aVal = a[sortConfig.key] || a[sortConfig.key === 'accountCode' ? 'code' : 'name'];
    let bVal = b[sortConfig.key] || b[sortConfig.key === 'accountCode' ? 'code' : 'name'];
    if (['openingBalance','currentBalance'].includes(sortConfig.key)) { aVal = a.openingBalance || a.currentBalance || 0; bVal = b.openingBalance || b.currentBalance || 0; }
    return sortConfig.direction === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  const accountSummary = accounts.reduce((acc, account) => {
    const type = account.type || account.accountType;
    if (!acc[type]) acc[type] = { count: 0, balance: 0 };
    acc[type].count++; acc[type].balance += account.currentBalance || 0;
    return acc;
  }, {} as Record<string, { count: number; balance: number }>);

  const downloadAccountsCSV = () => {
    if (filteredAccounts.length === 0) { toast.error("No accounts to export"); return; }
    const headers = ["Code","Name","Type","Sub Type","Group","Opening Balance","Current Balance"];
    const rows = filteredAccounts.map(acc => [acc.code||acc.accountNumber||'', acc.name||acc.accountName||'', acc.type||acc.accountType||'', acc.subType||acc.accountSubType||'', acc.accountGroup||'', acc.openingBalance||0, acc.currentBalance||0]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = `accounts_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast.success(`Exported ${filteredAccounts.length} accounts`);
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'asset':     return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'liability': return <TrendingDown className="h-4 w-4 text-red-400" />;
      case 'revenue':   return <DollarSign className="h-4 w-4 text-blue-400" />;
      case 'expense':   return <CreditCard className="h-4 w-4 text-orange-400" />;
      case 'equity':    return <BarChart3 className="h-4 w-4 text-purple-400" />;
      default:          return <Wallet className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTypeBadge = (type: string) => {
    if (isDark) {
      switch (type) {
        case 'asset':     return 'bg-green-500/20 text-green-300 border-green-500/30';
        case 'liability': return 'bg-red-500/20 text-red-300 border-red-500/30';
        case 'equity':    return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
        case 'revenue':   return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
        case 'expense':   return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
        default:          return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      }
    } else {
      switch (type) {
        case 'asset':     return 'bg-green-50 text-green-700 border-green-200';
        case 'liability': return 'bg-red-50 text-red-700 border-red-200';
        case 'equity':    return 'bg-purple-50 text-purple-700 border-purple-200';
        case 'revenue':   return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'expense':   return 'bg-orange-50 text-orange-700 border-orange-200';
        default:          return 'bg-gray-100 text-gray-600 border-gray-200';
      }
    }
  };

  const getSummaryColors = (type: string) => {
    if (isDark) {
      switch (type) {
        case 'asset':     return { icon: 'bg-green-500/10 border-green-500/20',   text: 'text-green-400' };
        case 'liability': return { icon: 'bg-red-500/10 border-red-500/20',       text: 'text-red-400' };
        case 'equity':    return { icon: 'bg-purple-500/10 border-purple-500/20', text: 'text-purple-400' };
        case 'revenue':   return { icon: 'bg-blue-500/10 border-blue-500/20',     text: 'text-blue-400' };
        case 'expense':   return { icon: 'bg-orange-500/10 border-orange-500/20', text: 'text-orange-400' };
        default:          return { icon: 'bg-gray-500/10 border-gray-500/20',     text: 'text-gray-400' };
      }
    } else {
      switch (type) {
        case 'asset':     return { icon: 'bg-green-50 border-green-200',   text: 'text-green-700' };
        case 'liability': return { icon: 'bg-red-50 border-red-200',       text: 'text-red-700' };
        case 'equity':    return { icon: 'bg-purple-50 border-purple-200', text: 'text-purple-700' };
        case 'revenue':   return { icon: 'bg-blue-50 border-blue-200',     text: 'text-blue-700' };
        case 'expense':   return { icon: 'bg-orange-50 border-orange-200', text: 'text-orange-700' };
        default:          return { icon: 'bg-gray-100 border-gray-200',    text: 'text-gray-600' };
      }
    }
  };

  const clearFilters = () => { setFilterType('all'); setSearchTerm(''); setSortConfig({ key: 'accountCode', direction: 'asc' }); };

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">{filteredAccounts.length} accounts</span>
                </div>
                <div className="h-3 w-px bg-white/20" />
                <span className="text-[#E84545] text-xs font-medium">{filterType === 'all' ? 'All Types' : filterType}</span>
                <div className="h-3 w-px bg-white/20" />
                {isDark ? <Moon className="h-3 w-3 text-[#E84545]" /> : <Sun className="h-3 w-3 text-[#E84545]" />}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 backdrop-blur-xl transition-colors duration-500"
          style={{ background: th.mobileHeaderBg, borderBottom: `1px solid ${th.mobileHeaderBorder}` }}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-xl font-bold" style={{ color: th.mobileHeaderTitle }}>Accounts</h1>
                <p className="text-xs" style={{ color: th.mobileHeaderSub }}>{filteredAccounts.length} accounts</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowFilters(true)} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}><Filter className="h-4 w-4" /></button>
                <button onClick={() => setShowMobileMenu(true)} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}><MoreVertical className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: th.filterIcon }} />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search accounts..."
                className="w-full pl-10 pr-4 py-2 rounded-xl text-sm"
                style={{ background: th.mobileSearchBg, border: `1px solid ${th.mobileSearchBorder}`, color: th.mobileSearchText }} />
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 border-b shadow-lg transition-colors duration-500"
          style={{ background: `linear-gradient(135deg,${th.headerBgFrom},${th.headerBgVia},${th.headerBgTo})`, borderColor: th.headerBorder }}>
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Wallet className="h-8 w-8" style={{ color: th.headerTitle }} />
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold" style={{ color: th.headerTitle }}>Chart of Accounts</h1>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                      style={{ background: isDark ? 'rgba(0,0,0,0.30)' : 'rgba(255,255,255,0.60)', border: `1px solid ${th.headerBorder}`, color: th.headerTitle }}>
                      {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                    </div>
                  </div>
                  <p className="mt-1" style={{ color: th.headerSub }}>Manage your account structure</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={downloadAccountsCSV}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg backdrop-blur-sm transition-all"
                  style={{ background: th.headerBtnBg, border: `1px solid ${th.headerBtnBorder}`, color: th.headerBtnText }}>
                  <FileDown className="h-4 w-4" />Export CSV
                </button>
                <button onClick={() => { setEditingAccount(null); resetForm(); setShowAddModal(true); }}
                  className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg transition-all"
                  style={{ background: 'linear-gradient(to right,#E84545,#cc3c3c)' }}>
                  <Plus className="h-4 w-4" />Add Account
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[160px] md:pt-6 pb-6">

          {/* Desktop Filters */}
          <div className="hidden md:block rounded-xl p-3 mb-4 transition-colors duration-500"
            style={{ background: th.filterPanelBg, border: `1px solid ${th.filterPanelBorder}` }}>
            <div className="grid grid-cols-5 gap-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4" style={{ color: th.filterIcon }} />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search accounts..."
                  className="w-full pl-8 pr-3 py-2 text-sm rounded" style={selectStyle} />
              </div>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 text-sm rounded appearance-none" style={selectStyle}>
                <option value="all">All Types</option>
                {['asset','liability','equity','revenue','expense'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
              <select value={sortConfig.key} onChange={e => handleSort(e.target.value)} className="px-3 py-2 text-sm rounded appearance-none" style={selectStyle}>
                <option value="accountCode">Sort by Code</option>
                <option value="accountName">Sort by Name</option>
                <option value="openingBalance">Sort by Opening</option>
                <option value="currentBalance">Sort by Balance</option>
              </select>
              <button onClick={() => router.push('/autocityPro/accounts/opening-balance')}
                className="px-4 py-2 text-sm rounded flex items-center justify-center gap-2 transition-colors"
                style={selectStyle}>
                <Calculator className="h-4 w-4" />Opening Balance
              </button>
              <button onClick={clearFilters} className="px-4 py-2 text-sm rounded transition-colors" style={selectStyle}>
                Clear All
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
            {['asset','liability','equity','revenue','expense'].map(type => {
              const colors = getSummaryColors(type);
              const isActive = filterType === type;
              return (
                <div key={type} onClick={() => setFilterType(filterType === type ? 'all' : type)}
                  className="rounded-xl p-4 md:p-6 cursor-pointer transition-all active:scale-[0.98]"
                  style={{ background: th.cardBg, border: `1px solid ${isActive ? '#E84545' : th.cardBorder}`, boxShadow: isActive ? '0 0 0 2px rgba(232,69,69,0.15)' : 'none' }}
                  onMouseEnter={e => !isActive && (e.currentTarget.style.borderColor = th.cardHoverBorder)}
                  onMouseLeave={e => !isActive && (e.currentTarget.style.borderColor = th.cardBorder)}>
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <div className={`p-2 md:p-3 rounded-xl border ${colors.icon}`}>
                      {getAccountTypeIcon(type)}
                    </div>
                    <span className={`text-xs font-semibold uppercase ${colors.text}`}>{type}</span>
                  </div>
                  <p className="text-lg md:text-2xl font-bold" style={{ color: th.cardTitle }}>{accountSummary[type]?.count || 0}</p>
                  <p className="text-xs md:text-sm mt-1" style={{ color: th.cardMuted }}>
                    QAR {(accountSummary[type]?.balance || 0).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Mobile Accounts List */}
          <div className="md:hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E84545]"></div>
              </div>
            ) : sortedAccounts.length === 0 ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                <Wallet className="h-12 w-12 mx-auto mb-4" style={{ color: th.emptyIcon }} />
                <p className="text-lg font-medium" style={{ color: th.emptyText }}>No accounts found</p>
                {(filterType !== 'all' || searchTerm) && (
                  <button onClick={clearFilters} className="mt-4 px-4 py-2 text-white text-sm font-semibold rounded-lg"
                    style={{ background: 'linear-gradient(to right,#E84545,#cc3c3c)' }}>Clear Filters</button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedAccounts.map(account => {
                  const aType = account.type || account.accountType;
                  const aCode = account.code || account.accountNumber;
                  const aName = account.name || account.accountName;
                  const balance = account.currentBalance || 0;
                  return (
                    <div key={account._id} className="rounded-xl p-4 transition-all"
                      style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = th.cardHoverBorder)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = th.cardBorder)}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          {getAccountTypeIcon(aType)}
                          <span className="text-sm font-semibold" style={{ color: th.cardTitle }}>{aCode}</span>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border capitalize ${getTypeBadge(aType)}`}>{aType}</span>
                        </div>
                        <button onClick={() => setShowMobileMenu(true)} className="p-1.5 rounded-lg transition-colors"
                          style={{ background: th.actionBtnBg, color: th.actionBtnText }}><MoreVertical className="h-4 w-4" /></button>
                      </div>
                      <p className="text-sm mb-3 truncate" style={{ color: th.cardTitle }}>{aName}</p>
                      <div className="grid grid-cols-3 gap-3 pt-3" style={{ borderTop: `1px solid ${th.tableBorder}` }}>
                        <div>
                          <span className="text-[10px] uppercase block mb-1" style={{ color: th.cardMuted }}>Group</span>
                          <p className="text-xs font-semibold truncate" style={{ color: th.cardSubtext }}>{account.accountGroup || '-'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase block mb-1" style={{ color: th.cardMuted }}>Opening</span>
                          <p className="text-xs font-semibold" style={{ color: th.cardSubtext }}>QAR {(account.openingBalance || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase block mb-1" style={{ color: th.cardMuted }}>Balance</span>
                          <p className={`text-xs font-bold ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>QAR {balance.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl overflow-hidden transition-colors duration-500"
            style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ background: th.tableHeaderBg }}>
                  {[
                    { label: 'Code', key: 'accountCode' }, { label: 'Account Name', key: 'accountName' },
                    { label: 'Type', key: null }, { label: 'Sub Type', key: null }, { label: 'Group', key: null },
                    { label: 'Opening', key: 'openingBalance' }, { label: 'Current', key: 'currentBalance' },
                    { label: 'Actions', key: null },
                  ].map(h => (
                    <th key={h.label} className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${h.key ? 'cursor-pointer' : ''}`}
                      style={{ color: th.tableHeaderText }} onClick={() => h.key && handleSort(h.key)}>
                      <div className="flex items-center">{h.label}{h.key && getSortIcon(h.key)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E84545] mx-auto mb-2"></div>
                    <p style={{ color: th.emptyText }}>Loading accounts...</p>
                  </td></tr>
                ) : sortedAccounts.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center">
                    <Wallet className="h-16 w-16 mx-auto mb-4" style={{ color: th.emptyIcon }} />
                    <p className="text-lg font-medium" style={{ color: th.emptyText }}>No accounts found</p>
                  </td></tr>
                ) : sortedAccounts.map(account => {
                  const aType    = account.type || account.accountType;
                  const aSubType = account.subType || account.accountSubType;
                  const aCode    = account.code || account.accountNumber;
                  const aName    = account.name || account.accountName;
                  const balance  = account.currentBalance || 0;
                  return (
                    <tr key={account._id} className="transition-colors" style={{ borderTop: `1px solid ${th.tableBorder}` }}
                      onMouseEnter={el => (el.currentTarget.style.background = th.tableRowHover)}
                      onMouseLeave={el => (el.currentTarget.style.background = 'transparent')}>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-[#E84545]">{aCode}</p>
                        {account.isSystem && <span className="text-xs px-2 py-0.5 rounded mt-1 inline-block" style={{ background: th.innerBg, color: th.cardMuted }}>System</span>}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: th.cardTitle }}>{aName}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full border capitalize ${getTypeBadge(aType)}`}>
                          {getAccountTypeIcon(aType)}{aType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: th.cardSubtext }}>
                        {accountSubTypes[aType]?.find(s => s.value === aSubType)?.label || aSubType || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: th.cardSubtext }}>{account.accountGroup || '-'}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: th.cardSubtext }}>QAR {(account.openingBalance || 0).toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <p className={`text-sm font-semibold ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>QAR {balance.toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => router.push(`/autocityPro/accounts/${account._id}`)}
                            className="p-2 rounded-lg transition-all"
                            style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.actionBtnText }}>
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleEdit(account)}
                            className="p-2 rounded-lg transition-all"
                            style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.actionBtnText }}>
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {!account.isSystem && (
                            <button onClick={() => handleDelete(account._id)}
                              className="p-2 rounded-lg transition-all"
                              style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: '#E84545' }}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="md:hidden h-24" />
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-500"
            style={{ background: th.modalBg, border: `1px solid ${th.modalBorder}` }}>
            <div className="flex justify-between items-center px-6 py-4" style={{ borderBottom: `1px solid ${th.modalBorder}` }}>
              <h2 className="text-xl font-bold" style={{ color: th.modalTitle }}>{editingAccount ? 'Edit Account' : 'Add Account'}</h2>
              <button onClick={() => { setShowAddModal(false); setEditingAccount(null); resetForm(); }}
                className="p-2 rounded-lg transition-colors" style={{ background: th.modalCloseBg, color: th.modalCloseText }}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[{ label: 'Account Code *', key: 'accountCode', disabled: editingAccount?.isSystem }, { label: 'Account Name *', key: 'accountName', disabled: false }].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium mb-1" style={{ color: th.modalLabel }}>{f.label}</label>
                    <input type="text" value={(formData as any)[f.key]} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                      required disabled={f.disabled}
                      className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent disabled:opacity-50"
                      style={modalInputStyle} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: th.modalLabel }}>Account Type *</label>
                  <select value={formData.accountType}
                    onChange={e => setFormData({ ...formData, accountType: e.target.value as any, accountSubType: '', accountGroup: '' })}
                    disabled={editingAccount?.isSystem}
                    className="w-full px-3 py-2 rounded-lg appearance-none focus:ring-2 focus:ring-[#E84545] disabled:opacity-50"
                    style={modalInputStyle}>
                    {['asset','liability','equity','revenue','expense'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: th.modalLabel }}>Sub Type</label>
                  <select value={formData.accountSubType} onChange={e => setFormData({ ...formData, accountSubType: e.target.value })}
                    disabled={editingAccount?.isSystem}
                    className="w-full px-3 py-2 rounded-lg appearance-none focus:ring-2 focus:ring-[#E84545] disabled:opacity-50"
                    style={modalInputStyle}>
                    <option value="">Select Sub Type</option>
                    {(accountSubTypes[formData.accountType] || []).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: th.modalLabel }}>Account Group *</label>
                  <select value={formData.accountGroup} onChange={e => setFormData({ ...formData, accountGroup: e.target.value })} required
                    className="w-full px-3 py-2 rounded-lg appearance-none focus:ring-2 focus:ring-[#E84545]"
                    style={modalInputStyle}>
                    <option value="">Select Group</option>
                    {(accountGroups[formData.accountType] || []).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: th.modalLabel }}>
                  Opening Balance
                  {editingAccount && <span className="text-xs ml-2" style={{ color: th.cardMuted }}>(Updates will create a journal entry)</span>}
                </label>
                <input type="number" value={formData.openingBalance} step="0.01"
                  onChange={e => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545]"
                  style={modalInputStyle} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: th.modalLabel }}>Description</label>
                <textarea value={formData.description} rows={3} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545]"
                  style={modalInputStyle} placeholder="Optional description" />
              </div>
              <div className="flex justify-end gap-3 pt-4" style={{ borderTop: `1px solid ${th.modalBorder}` }}>
                <button type="button" onClick={() => { setShowAddModal(false); setEditingAccount(null); resetForm(); }}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.cardTitle }}>Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50"
                  style={{ background: 'linear-gradient(to right,#E84545,#cc3c3c)' }}>
                  {saving ? 'Saving...' : editingAccount ? 'Update' : 'Create'} Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Filter Modal */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom duration-300"
            style={{ background: th.modalBg, borderColor: th.modalBorder }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: th.modalTitle }}>Filters & Sort</h2>
              <button onClick={() => setShowFilters(false)} className="p-2 rounded-xl"
                style={{ background: th.modalCloseBg, color: th.modalCloseText }}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Account Type', val: filterType, set: setFilterType, opts: [['all','All Types'],['asset','Assets'],['liability','Liabilities'],['equity','Equity'],['revenue','Revenue'],['expense','Expenses']] },
                { label: 'Sort By', val: sortConfig.key, set: (v: string) => handleSort(v), opts: [['accountCode','Code (A-Z)'],['accountName','Name (A-Z)'],['openingBalance','Opening (High to Low)'],['currentBalance','Balance (High to Low)']] },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-sm font-medium mb-2" style={{ color: th.modalLabel }}>{f.label}</label>
                  <select value={f.val} onChange={e => f.set(e.target.value)} className="w-full px-3 py-3 rounded-xl"
                    style={{ background: th.modalInputBg, border: `1px solid ${th.modalInputBorder}`, color: th.modalInputText }}>
                    {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
              <div className="flex gap-3 pt-4" style={{ borderTop: `1px solid ${th.modalBorder}` }}>
                <button onClick={() => { clearFilters(); setShowFilters(false); }}
                  className="flex-1 px-4 py-3 rounded-xl transition-colors"
                  style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.cardTitle }}>Clear All</button>
                <button onClick={() => setShowFilters(false)}
                  className="flex-1 px-4 py-3 rounded-xl text-white font-semibold"
                  style={{ background: 'linear-gradient(to right,#E84545,#cc3c3c)' }}>Apply</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Action Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom duration-300"
            style={{ background: th.modalBg, borderColor: th.modalBorder }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: th.modalTitle }}>Actions</h2>
              <button onClick={() => setShowMobileMenu(false)} className="p-2 rounded-xl"
                style={{ background: th.modalCloseBg, color: th.modalCloseText }}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Add Account', icon: <Plus className="h-5 w-5" />, action: () => { setEditingAccount(null); resetForm(); setShowAddModal(true); setShowMobileMenu(false); } },
                { label: 'Opening Balance', icon: <Calculator className="h-5 w-5" />, action: () => { router.push('/autocityPro/accounts/opening-balance'); setShowMobileMenu(false); } },
                { label: 'Export CSV', icon: <FileDown className="h-5 w-5" />, action: () => { downloadAccountsCSV(); setShowMobileMenu(false); } },
                { label: 'Refresh Data', icon: <RefreshCw className="h-5 w-5" />, action: () => { fetchAccounts(); setShowMobileMenu(false); toast.success('Accounts refreshed'); } },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action}
                  className="w-full p-4 rounded-xl font-semibold flex items-center justify-between active:scale-95 transition-all"
                  style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.cardTitle }}>
                  <span>{btn.label}</span>{btn.icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}