'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Wallet, ArrowLeft, Edit2, Trash2, Save, X,
  TrendingUp, TrendingDown, RefreshCw, FileText,
  Eye, FileDown, Calculator, BarChart3, Receipt,
  Plus, MoreVertical, ChevronLeft, AlertCircle,
  History, Sun, Moon,
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

export default function AccountDetailPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id as string;
  const isDark = useTimeBasedTheme();

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
    cardBg:             isDark ? '#0A0A0A'                                              : '#ffffff',
    cardBorder:         isDark ? 'rgba(255,255,255,0.06)'                               : 'rgba(0,0,0,0.08)',
    cardHoverBorder:    isDark ? 'rgba(232,69,69,0.40)'                                 : 'rgba(232,69,69,0.40)',
    cardTitle:          isDark ? '#ffffff'                                              : '#111827',
    cardSubtext:        isDark ? '#9ca3af'                                              : '#6b7280',
    cardMuted:          isDark ? '#6b7280'                                              : '#9ca3af',
    innerBg:            isDark ? '#111111'                                              : '#f9fafb',
    innerBorder:        isDark ? 'rgba(255,255,255,0.06)'                               : 'rgba(0,0,0,0.08)',
    inputBg:            isDark ? '#000000'                                              : '#ffffff',
    inputBorder:        isDark ? 'rgba(255,255,255,0.10)'                               : 'rgba(0,0,0,0.15)',
    inputText:          isDark ? '#ffffff'                                              : '#111827',
    labelText:          isDark ? '#d1d5db'                                              : '#374151',
    sectionBorder:      isDark ? 'rgba(255,255,255,0.06)'                               : 'rgba(0,0,0,0.08)',
    txBg:               isDark ? '#0A0A0A'                                              : '#f9fafb',
    txBorder:           isDark ? 'rgba(255,255,255,0.06)'                               : 'rgba(0,0,0,0.08)',
    actionBtnBg:        isDark ? '#111111'                                              : '#f3f4f6',
    actionBtnBorder:    isDark ? 'rgba(255,255,255,0.08)'                               : 'rgba(0,0,0,0.08)',
    actionBtnText:      isDark ? '#9ca3af'                                              : '#6b7280',
    warningBg:          isDark ? 'rgba(234,179,8,0.10)'                                 : 'rgba(234,179,8,0.08)',
    warningBorder:      isDark ? 'rgba(234,179,8,0.30)'                                 : 'rgba(234,179,8,0.25)',
    warningText:        isDark ? '#fbbf24'                                              : '#92400e',
    modalBg:            isDark ? 'linear-gradient(180deg,#0A0A0A,#050505)'             : 'linear-gradient(180deg,#ffffff,#f9fafb)',
    modalBorder:        isDark ? 'rgba(255,255,255,0.10)'                               : 'rgba(0,0,0,0.08)',
    modalTitle:         isDark ? '#ffffff'                                              : '#111827',
    modalCloseBg:       isDark ? 'rgba(255,255,255,0.05)'                               : 'rgba(0,0,0,0.05)',
    modalCloseText:     isDark ? '#9ca3af'                                              : '#6b7280',
    emptyIcon:          isDark ? '#374151'                                              : '#d1d5db',
    emptyText:          isDark ? '#9ca3af'                                              : '#6b7280',
  };

  const inputStyle = {
    background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText,
  };

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
    fetchUser(); fetchAccount(); fetchRecentTransactions();
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [accountId]);

  const fetchUser = async () => {
    try { const r = await fetch('/api/auth/me', { credentials: 'include' }); if (r.ok) { const d = await r.json(); setUser(d.user); } } catch {}
  };

  const fetchAccount = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/accounts/${accountId}`, { credentials: 'include' });
      if (r.ok) {
        const d = await r.json(); const acc = d.account; setAccount(acc);
        setFormData({
          accountCode:    acc.code || acc.accountNumber || '',
          accountName:    acc.name || acc.accountName || '',
          accountType:    acc.type || acc.accountType || 'asset',
          accountSubType: acc.subType || acc.accountSubType || '',
          accountGroup:   acc.accountGroup || '',
          openingBalance: acc.openingBalance || 0,
          description:    acc.description || '',
        });
      } else { toast.error('Account not found'); router.push('/autocityPro/accounts'); }
    } catch { toast.error('Failed to fetch account'); }
    finally { setLoading(false); }
  };

  const fetchRecentTransactions = async () => {
    try {
      const r = await fetch(`/api/ledger-entries?accountId=${accountId}&limit=5`, { credentials: 'include' });
      if (r.ok) { const d = await r.json(); setRecentTransactions(d.entries || []); }
    } catch {}
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const r = await fetch(`/api/accounts/${accountId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(formData) });
      if (r.ok) { toast.success('Account updated!'); setIsEditing(false); fetchAccount(); }
      else { const e = await r.json(); toast.error(e.error || 'Failed to update'); }
    } catch { toast.error('Failed to update account'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) return;
    try {
      const r = await fetch(`/api/accounts/${accountId}`, { method: 'DELETE', credentials: 'include' });
      if (r.ok) { toast.success('Account deleted!'); router.push('/autocityPro/accounts'); }
      else { const e = await r.json(); toast.error(e.error || 'Failed to delete'); }
    } catch { toast.error('Failed to delete account'); }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    if (account) setFormData({ accountCode: account.code || account.accountNumber || '', accountName: account.name || account.accountName || '', accountType: account.type || account.accountType || 'asset', accountSubType: account.subType || account.accountSubType || '', accountGroup: account.accountGroup || '', openingBalance: account.openingBalance || 0, description: account.description || '' });
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'asset':     return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'liability': return <TrendingDown className="h-4 w-4 text-red-400" />;
      case 'revenue':   return <Calculator className="h-4 w-4 text-blue-400" />;
      case 'expense':   return <Receipt className="h-4 w-4 text-orange-400" />;
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

  const downloadAccountCSV = () => {
    if (!account || recentTransactions.length === 0) { toast.error("No transaction data to export"); return; }
    const headers = ["Date", "Voucher #", "Type", "Narration", "Debit", "Credit", "Balance"];
    const rows = recentTransactions.map(e => [new Date(e.date).toLocaleDateString(), e.voucherNumber || '', e.voucherType || '', e.narration || '', e.debit || 0, e.credit || 0, e.balance || 0]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `account_${account.code || account.accountNumber}_transactions.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast.success(`Exported ${recentTransactions.length} transactions`);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };

  if (loading) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="min-h-screen flex items-center justify-center transition-colors duration-500" style={{ background: th.pageBg }}>
          <div className="text-center">
            <RefreshCw className="h-16 w-16 animate-spin text-[#E84545] mx-auto mb-4" />
            <p style={{ color: th.cardMuted }}>Loading account...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!account) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>
          <div className="text-center py-12">
            <Wallet className="h-16 w-16 mx-auto mb-4" style={{ color: th.emptyIcon }} />
            <h2 className="text-2xl font-bold mb-2" style={{ color: th.cardTitle }}>Account Not Found</h2>
            <button onClick={() => router.push('/autocityPro/accounts')}
              className="mt-4 px-4 py-2 text-white rounded-lg"
              style={{ background: 'linear-gradient(to right,#E84545,#cc3c3c)' }}>
              Back to Accounts
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const accountType    = account.type || account.accountType;
  const accountSubType = account.subType || account.accountSubType;
  const accountCode    = account.code || account.accountNumber;
  const accountName    = account.name || account.accountName;
  const balanceChange  = (account.currentBalance || 0) - (account.openingBalance || 0);

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
                  <span className="text-white text-xs font-semibold">{accountCode}</span>
                </div>
                <div className="h-3 w-px bg-white/20" />
                <div className="flex items-center gap-1.5">
                  {getAccountTypeIcon(accountType)}
                  <span className="text-[#E84545] text-xs font-medium capitalize">{accountType}</span>
                </div>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => router.push('/autocityPro/accounts')} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: th.mobileHeaderTitle }}>{accountName.substring(0, 20)}</h1>
                  <p className="text-xs" style={{ color: th.mobileHeaderSub }}>{accountCode}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && !account.isSystem && (
                  <button onClick={() => setIsEditing(true)} className="p-2 rounded-xl active:scale-95 transition-all"
                    style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => setShowMobileMenu(true)} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 border-b shadow-lg transition-colors duration-500"
          style={{ background: `linear-gradient(135deg,${th.headerBgFrom},${th.headerBgVia},${th.headerBgTo})`, borderColor: th.headerBorder }}>
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button onClick={() => router.push('/autocityPro/accounts')}
                  className="p-2 rounded-xl transition-all" style={{ background: th.headerBtnBg, color: th.headerTitle }}>
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-3">
                  <Wallet className="h-8 w-8" style={{ color: th.headerTitle }} />
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-3xl font-bold" style={{ color: th.headerTitle }}>
                        {isEditing ? 'Edit Account' : accountName}
                      </h1>
                      
                    </div>
                    <p className="mt-1" style={{ color: th.headerSub }}>{accountCode} · {accountType}</p>
                  </div>
                </div>
              </div>

              {!isEditing && (
                <div className="flex gap-3">
                  <button onClick={() => router.push(`/autocityPro/ledgers?account=${accountId}`)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg backdrop-blur-sm transition-all"
                    style={{ background: th.headerBtnBg, border: `1px solid ${th.headerBtnBorder}`, color: th.headerBtnText }}>
                    <Eye className="h-4 w-4" />View Ledger
                  </button>
                  {!account.isSystem && (
                    <>
                      <button onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg backdrop-blur-sm transition-all"
                        style={{ background: th.headerBtnBg, border: `1px solid ${th.headerBtnBorder}`, color: th.headerBtnText }}>
                        <Edit2 className="h-4 w-4" />Edit
                      </button>
                      <button onClick={handleDelete}
                        className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg transition-all"
                        style={{ background: 'linear-gradient(to right,#E84545,#cc3c3c)' }}>
                        <Trash2 className="h-4 w-4" />Delete
                      </button>
                    </>
                  )}
                </div>
              )}

              {isEditing && (
                <div className="flex gap-3">
                  <button onClick={cancelEdit}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg backdrop-blur-sm transition-all"
                    style={{ background: th.headerBtnBg, border: `1px solid ${th.headerBtnBorder}`, color: th.headerBtnText }}>
                    <X className="h-4 w-4" />Cancel
                  </button>
                  <button onClick={handleUpdate} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(to right,#E84545,#cc3c3c)' }}>
                    <Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[100px] md:pt-6 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Main Details */}
            <div className="lg:col-span-2 space-y-6">
              {isEditing ? (
                <div className="rounded-2xl p-6 transition-colors duration-500"
                  style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                  <h2 className="text-xl font-bold mb-4" style={{ color: th.cardTitle }}>Account Information</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Account Code *', key: 'accountCode', type: 'text' },
                        { label: 'Account Name *', key: 'accountName', type: 'text' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="block text-sm font-medium mb-1" style={{ color: th.labelText }}>{f.label}</label>
                          <input type={f.type} value={(formData as any)[f.key]}
                            onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
                            style={inputStyle} />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: th.labelText }}>Account Type *</label>
                        <select value={formData.accountType}
                          onChange={e => setFormData({ ...formData, accountType: e.target.value as any, accountSubType: '', accountGroup: '' })}
                          className="w-full px-3 py-2 rounded-lg appearance-none focus:ring-2 focus:ring-[#E84545]"
                          style={inputStyle}>
                          {['asset','liability','equity','revenue','expense'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: th.labelText }}>Sub Type</label>
                        <select value={formData.accountSubType} onChange={e => setFormData({ ...formData, accountSubType: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg appearance-none focus:ring-2 focus:ring-[#E84545]"
                          style={inputStyle}>
                          <option value="">Select Sub Type</option>
                          {(accountSubTypes[formData.accountType] || []).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: th.labelText }}>Account Group *</label>
                        <select value={formData.accountGroup} onChange={e => setFormData({ ...formData, accountGroup: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg appearance-none focus:ring-2 focus:ring-[#E84545]"
                          style={inputStyle}>
                          <option value="">Select Group</option>
                          {(accountGroups[formData.accountType] || []).map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: th.labelText }}>Opening Balance</label>
                      <input type="number" value={formData.openingBalance} step="0.01"
                        onChange={e => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545]"
                        style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: th.labelText }}>Description</label>
                      <textarea value={formData.description} rows={4}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545]"
                        style={inputStyle} placeholder="Optional description" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-6 transition-colors duration-500"
                  style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                  <h2 className="text-xl font-bold mb-4" style={{ color: th.cardTitle }}>Account Information</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm" style={{ color: th.cardMuted }}>Account Number</label>
                        <p className="text-lg font-semibold mt-1" style={{ color: th.cardTitle }}>{accountCode}</p>
                      </div>
                      <div>
                        <label className="text-sm" style={{ color: th.cardMuted }}>Account Type</label>
                        <div className="mt-1">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border capitalize ${getTypeBadge(accountType)}`}>
                            {getAccountTypeIcon(accountType)}{accountType}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm" style={{ color: th.cardMuted }}>Sub Type</label>
                        <p className="text-lg font-semibold mt-1" style={{ color: th.cardTitle }}>
                          {accountSubTypes[accountType]?.find(s => s.value === accountSubType)?.label || accountSubType || '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm" style={{ color: th.cardMuted }}>Account Group</label>
                        <p className="text-lg font-semibold mt-1" style={{ color: th.cardTitle }}>{account.accountGroup || '-'}</p>
                      </div>
                    </div>
                    {account.description && (
                      <div>
                        <label className="text-sm" style={{ color: th.cardMuted }}>Description</label>
                        <p className="mt-1" style={{ color: th.cardSubtext }}>{account.description}</p>
                      </div>
                    )}
                    {account.isSystem && (
                      <div className="p-3 rounded-lg" style={{ background: th.warningBg, border: `1px solid ${th.warningBorder}` }}>
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: th.warningText }} />
                          <p className="text-sm" style={{ color: th.warningText }}>
                            <strong>System Account:</strong> This account is managed by the system and cannot be deleted.
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="pt-4" style={{ borderTop: `1px solid ${th.sectionBorder}` }}>
                      <label className="text-sm" style={{ color: th.cardMuted }}>Created</label>
                      <p className="mt-1" style={{ color: th.cardSubtext }}>
                        {new Date(account.createdAt).toLocaleDateString()} at {new Date(account.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Transactions */}
              {!isEditing && recentTransactions.length > 0 && (
                <div className="rounded-2xl p-6 transition-colors duration-500"
                  style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold" style={{ color: th.cardTitle }}>Recent Transactions</h2>
                    <button onClick={() => router.push(`/autocityPro/ledgers?account=${accountId}`)}
                      className="text-sm flex items-center gap-1 text-[#E84545] hover:text-[#cc3c3c]">
                      <span>View All</span><History className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {recentTransactions.map(entry => (
                      <div key={entry._id} className="flex justify-between items-center p-4 rounded-xl transition-colors"
                        style={{ background: th.txBg, border: `1px solid ${th.txBorder}` }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = th.cardHoverBorder)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = th.txBorder)}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${entry.debit > 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                            <FileText className="h-4 w-4" style={{ color: th.cardMuted }} />
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: th.cardTitle }}>{entry.narration}</p>
                            <p className="text-sm" style={{ color: th.cardMuted }}>
                              {new Date(entry.date).toLocaleDateString()} · {entry.voucherNumber}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {entry.debit > 0 && <p className="font-semibold text-green-400">DR: QAR {entry.debit.toFixed(2)}</p>}
                          {entry.credit > 0 && <p className="font-semibold text-red-400">CR: QAR {entry.credit.toFixed(2)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Balance + Quick Actions */}
            <div className="space-y-6">
              <div className="rounded-2xl p-6 transition-colors duration-500"
                style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                <h2 className="text-xl font-bold mb-4" style={{ color: th.cardTitle }}>Balance Summary</h2>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl" style={{ background: th.innerBg, border: `1px solid ${th.innerBorder}` }}>
                    <label className="text-sm" style={{ color: th.cardMuted }}>Opening Balance</label>
                    <p className="text-2xl font-bold mt-1" style={{ color: th.cardTitle }}>QAR {(account.openingBalance || 0).toFixed(2)}</p>
                  </div>
                  <div className="p-4 rounded-xl transition-colors"
                    style={{ background: th.innerBg, border: `1px solid ${th.innerBorder}` }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = th.cardHoverBorder)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = th.innerBorder)}>
                    <label className="text-sm" style={{ color: th.cardMuted }}>Current Balance</label>
                    <p className={`text-3xl font-bold mt-1 ${(account.currentBalance || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      QAR {(account.currentBalance || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: th.innerBg, border: `1px solid ${th.innerBorder}` }}>
                    <div className="flex items-center justify-between">
                      <label className="text-sm" style={{ color: th.cardMuted }}>Change</label>
                      {balanceChange !== 0 && (balanceChange > 0
                        ? <TrendingUp className="h-5 w-5 text-green-400" />
                        : <TrendingDown className="h-5 w-5 text-red-400" />)}
                    </div>
                    <p className={`text-xl font-bold mt-1 ${balanceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {balanceChange >= 0 ? '+' : ''}QAR {Math.abs(balanceChange).toFixed(2)}
                    </p>
                    <p className="text-xs mt-1" style={{ color: th.cardMuted }}>
                      {balanceChange >= 0 ? 'Increase' : 'Decrease'} from opening balance
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl p-6 transition-colors duration-500"
                style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                <h2 className="text-xl font-bold mb-4" style={{ color: th.cardTitle }}>Quick Actions</h2>
                <div className="space-y-2">
                  {[
                    { label: 'View Full Ledger', icon: <Eye className="h-4 w-4" />, right: <History className="h-4 w-4" />, action: () => router.push(`/autocityPro/ledgers?account=${accountId}`) },
                    { label: 'Create Journal Entry', icon: <Plus className="h-4 w-4" />, right: <FileText className="h-4 w-4" />, action: () => router.push('/autocityPro/vouchers/journal') },
                    { label: 'View in Balance Sheet', icon: <BarChart3 className="h-4 w-4" />, right: <Calculator className="h-4 w-4" />, action: () => router.push('/autocityPro/reports/balance-sheet') },
                    { label: 'View Trial Balance', icon: <BarChart3 className="h-4 w-4" />, right: <Calculator className="h-4 w-4" />, action: () => router.push('/autocityPro/reports/trial-balance') },
                  ].map(btn => (
                    <button key={btn.label} onClick={btn.action}
                      className="w-full px-4 py-3 rounded-lg text-left flex items-center justify-between transition-all"
                      style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.cardTitle }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = th.cardHoverBorder)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = th.actionBtnBorder)}>
                      <div className="flex items-center gap-2">
                        <span style={{ color: th.cardMuted }}>{btn.icon}</span>
                        <span className="text-sm">{btn.label}</span>
                      </div>
                      <span style={{ color: th.cardMuted }}>{btn.right}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="md:hidden h-24" />
      </div>

      {/* Mobile Action Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom duration-300"
            style={{ background: th.modalBg, borderColor: th.modalBorder }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: th.modalTitle }}>Actions</h2>
              <button onClick={() => setShowMobileMenu(false)} className="p-2 rounded-xl"
                style={{ background: th.modalCloseBg, color: th.modalCloseText }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'View Ledger', icon: <Eye className="h-5 w-5" />, action: () => { router.push(`/autocityPro/ledgers?account=${accountId}`); setShowMobileMenu(false); } },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action}
                  className="w-full p-4 rounded-xl font-semibold flex items-center justify-between active:scale-95 transition-all"
                  style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.cardTitle }}>
                  <span>{btn.label}</span>{btn.icon}
                </button>
              ))}
              {!account.isSystem && (
                <>
                  <button onClick={() => { setIsEditing(true); setShowMobileMenu(false); }}
                    className="w-full p-4 rounded-xl font-semibold flex items-center justify-between active:scale-95 transition-all"
                    style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.cardTitle }}>
                    <span>Edit Account</span><Edit2 className="h-5 w-5" />
                  </button>
                  <button onClick={() => { handleDelete(); setShowMobileMenu(false); }}
                    className="w-full p-4 rounded-xl font-semibold flex items-center justify-between active:scale-95 transition-all"
                    style={{ background: 'rgba(232,69,69,0.10)', border: '1px solid rgba(232,69,69,0.20)', color: '#E84545' }}>
                    <span>Delete Account</span><Trash2 className="h-5 w-5" />
                  </button>
                </>
              )}
              <button onClick={() => { router.push('/autocityPro/vouchers/journal'); setShowMobileMenu(false); }}
                className="w-full p-4 rounded-xl font-semibold flex items-center justify-between active:scale-95 transition-all"
                style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.cardTitle }}>
                <span>Create Journal Entry</span><Plus className="h-5 w-5" />
              </button>
              <button onClick={() => { downloadAccountCSV(); setShowMobileMenu(false); }}
                className="w-full p-4 rounded-xl font-semibold flex items-center justify-between active:scale-95 transition-all"
                style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.cardTitle }}>
                <span>Export Transactions</span><FileDown className="h-5 w-5" />
              </button>
              <button onClick={() => { fetchAccount(); fetchRecentTransactions(); setShowMobileMenu(false); toast.success('Refreshed'); }}
                className="w-full p-4 rounded-xl font-semibold flex items-center justify-between active:scale-95 transition-all"
                style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.cardTitle }}>
                <span>Refresh Data</span><RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}