'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  FileText, 
  DollarSign, 
  BookOpen, 
  ArrowLeftRight, 
  Filter,
  X,
  ChevronLeft,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  FileDown,
  RefreshCw,
  Calendar,
  ChevronRight,
  Download,
  SortAsc,
  SortDesc,
  AlertCircle,
  CheckCircle,
  Clock,
  Ban,
  LucideBadgeAlert,
  Loader2,
  Sun,
  Moon,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Time-based theme hook ─────────────────────────────────────────────────────
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

export default function VouchersPage() {
  const router = useRouter();
  const isDark = useTimeBasedTheme();

  const [user, setUser] = useState<any>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc'
  });
  
  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // ── Theme tokens ───────────────────────────────────────────────────────────
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
    cardHoverBorder:    isDark ? 'rgba(232,69,69,0.30)'                                 : 'rgba(232,69,69,0.40)',
    cardTitle:          isDark ? '#ffffff'                                              : '#111827',
    cardSubtext:        isDark ? '#9ca3af'                                              : '#6b7280',
    cardMuted:          isDark ? '#6b7280'                                              : '#9ca3af',
    tableHeaderBg:      isDark ? '#111111'                                              : '#f9fafb',
    tableHeaderText:    isDark ? '#9ca3af'                                              : '#6b7280',
    tableRowHover:      isDark ? 'rgba(255,255,255,0.02)'                               : 'rgba(0,0,0,0.02)',
    tableBorder:        isDark ? 'rgba(255,255,255,0.04)'                               : 'rgba(0,0,0,0.06)',
    actionBtnBg:        isDark ? '#111111'                                              : '#f3f4f6',
    actionBtnBorder:    isDark ? 'rgba(255,255,255,0.08)'                               : 'rgba(0,0,0,0.08)',
    actionBtnText:      isDark ? '#9ca3af'                                              : '#6b7280',
    quickCardBg:        isDark ? '#0A0A0A'                                              : '#ffffff',
    quickCardBorder:    isDark ? 'rgba(255,255,255,0.05)'                               : 'rgba(0,0,0,0.08)',
    emptyIcon:          isDark ? '#374151'                                              : '#d1d5db',
    emptyText:          isDark ? '#9ca3af'                                              : '#6b7280',
    modalBg:            isDark ? 'linear-gradient(180deg,#0A0A0A,#050505)'             : 'linear-gradient(180deg,#ffffff,#f9fafb)',
    modalBorder:        isDark ? 'rgba(255,255,255,0.10)'                               : 'rgba(0,0,0,0.08)',
    modalTitle:         isDark ? '#ffffff'                                              : '#111827',
    modalCloseBg:       isDark ? 'rgba(255,255,255,0.05)'                               : 'rgba(0,0,0,0.05)',
    modalCloseText:     isDark ? '#9ca3af'                                              : '#6b7280',
    modalSelectBg:      isDark ? '#111111'                                              : '#ffffff',
    modalSelectBorder:  isDark ? 'rgba(255,255,255,0.10)'                               : 'rgba(0,0,0,0.10)',
    modalSelectText:    isDark ? '#ffffff'                                              : '#111827',
    modalLabel:         isDark ? '#d1d5db'                                              : '#374151',
    statusDraft:        isDark ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : 'bg-yellow-50 text-yellow-700 border-yellow-200',
    statusPosted:       isDark ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'      : 'bg-blue-50 text-blue-700 border-blue-200',
    statusApproved:     isDark ? 'bg-green-500/20 text-green-300 border-green-500/30'   : 'bg-green-50 text-green-700 border-green-200',
    statusVoid:         isDark ? 'bg-red-500/20 text-red-300 border-red-500/30'         : 'bg-red-50 text-red-600 border-red-200',
  };

  const selectStyle = {
    background: th.filterInputBg,
    border: `1px solid ${th.filterInputBorder}`,
    color: th.filterInputText,
  };
  
  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    const checkIfMobile = () => setIsMobile(window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Reset and reload when filters change
  useEffect(() => {
    fetchVouchers(1);
  }, [filterType, filterStatus]);

  // Memoized load more function
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchVouchers(nextPage);
  }, [page, hasMore, loadingMore, loading, totalPages]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    if (loading || !hasMore) return;

    const options = { root: null, rootMargin: '200px', threshold: 0.1 };
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    }, options);

    const currentRef = bottomRef.current;
    if (currentRef) observerRef.current.observe(currentRef);
    return () => { if (observerRef.current) observerRef.current.disconnect(); };
  }, [loading, hasMore, loadMore]);
  
  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) { const data = await res.json(); setUser(data.user); }
    } catch {}
  };
  
  const fetchVouchers = async (pageNum: number) => {
    try {
      if (pageNum === 1) { setPage(1); setVouchers([]); setHasMore(true); setLoading(true); } else { setLoadingMore(true); }

      let url = `/api/vouchers?page=${pageNum}&limit=20`;
      if (filterType !== 'all') url += `&voucherType=${filterType}`;
      if (filterStatus !== 'all') url += `&status=${filterStatus}`;
      
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const newVouchers = data.vouchers || [];
        
        if (pageNum === 1) {
          setVouchers(newVouchers);
        } else {
          setVouchers(prev => {
            const existingIds = new Set(prev.map(v => v._id));
            const uniqueNew = newVouchers.filter((v: any) => !existingIds.has(v._id));
            return [...prev, ...uniqueNew];
          });
        }
        
        const pages = data.pagination?.pages || 1;
        setTotalPages(pages);
        setHasMore(pageNum < pages);
      } else {
        toast.error('Failed to fetch vouchers');
        setHasMore(false);
      }
    } catch (error) {
      toast.error('Failed to fetch vouchers');
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    fetchVouchers(1);
    toast.success('Vouchers refreshed');
  };
  
  const getVoucherTypeIcon = (type: string) => {
    switch (type) {
      case 'payment':       return <DollarSign className="h-4 w-4 text-red-400" />;
      case 'ledger-entries':return <LucideBadgeAlert className="h-4 w-4 text-green-400" />;
      case 'journal':       return <BookOpen className="h-4 w-4 text-blue-400" />;
      case 'contra':        return <ArrowLeftRight className="h-4 w-4 text-purple-400" />;
      default:              return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':    return <Clock className="h-4 w-4" />;
      case 'posted':   return <CheckCircle className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'void':     return <Ban className="h-4 w-4" />;
      default:         return <AlertCircle className="h-4 w-4" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':    return th.statusDraft;
      case 'posted':   return th.statusPosted;
      case 'approved': return th.statusApproved;
      case 'void':     return th.statusVoid;
      default:         return isDark ? 'bg-gray-500/20 text-gray-300 border-gray-500/30' : 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredVouchers = vouchers.filter(v =>
    v.voucherNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.narration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedVouchers = [...filteredVouchers].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    if (sortConfig.key === 'date') { aValue = new Date(a.date).getTime(); bValue = new Date(b.date).getTime(); }
    if (sortConfig.key === 'amount') { aValue = a.totalDebit || 0; bValue = b.totalDebit || 0; }
    return sortConfig.direction === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
  });
  
  const handleDeleteVoucher = async (id: string, voucherNumber: string) => {
    if (!confirm(`Are you sure you want to delete voucher ${voucherNumber}? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/vouchers/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) { toast.success('Voucher deleted successfully!'); setVouchers(prev => prev.filter(v => v._id !== id)); }
      else { const error = await res.json(); toast.error(error.error || 'Failed to delete voucher'); }
    } catch { toast.error('Failed to delete voucher'); }
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };

  const downloadVouchersCSV = () => {
    if (filteredVouchers.length === 0) { toast.error("No vouchers to export"); return; }
    const headers = ["Voucher #", "Type", "Date", "Narration", "Amount", "Status", "Reference"];
    const rows = filteredVouchers.map(v => [
      v.voucherNumber || '', v.voucherType || '',
      new Date(v.date).toLocaleDateString(),
      `"${(v.narration || '').replace(/"/g, '""')}"`,
      v.totalDebit || 0, v.status || '', v.referenceNumber || ''
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `vouchers_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast.success(`Exported ${filteredVouchers.length} vouchers to CSV`);
  };
  
  const voucherTypes = [
    { value: 'ledger entries', label: 'Ledger Entries', href: '/autocityPro/ledger-entries' },
    { value: 'journal',        label: 'Journal',        href: '/autocityPro/vouchers/journal' },
    { value: 'contra',         label: 'Contra',         href: '/autocityPro/vouchers/contra' },
  ];
  
  const clearFilters = () => {
    setFilterType('all'); setFilterStatus('all');
    setSearchTerm(''); setSortConfig({ key: 'date', direction: 'desc' });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc'
      ? <SortAsc className="h-3 w-3 ml-1 text-[#E84545]" />
      : <SortDesc className="h-3 w-3 ml-1 text-[#E84545]" />;
  };
  
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">{vouchers.length} loaded</span>
                </div>
                {hasMore && !loading && (
                  <>
                    <div className="h-3 w-px bg-white/20"></div>
                    <span className="text-white/60 text-xs">Scroll for more</span>
                  </>
                )}
                <div className="h-3 w-px bg-white/20"></div>
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
                <h1 className="text-xl font-bold" style={{ color: th.mobileHeaderTitle }}>Vouchers</h1>
                <p className="text-xs" style={{ color: th.mobileHeaderSub }}>
                  {vouchers.length} loaded{hasMore && ' • Scroll for more'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleRefresh} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button onClick={() => setShowFilters(true)} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                  <Filter className="h-4 w-4" />
                </button>
                <button onClick={() => setShowMobileMenu(true)} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: th.filterIcon }} />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search vouchers..."
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
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold" style={{ color: th.headerTitle }}>Vouchers</h1>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                    style={{ background: isDark ? 'rgba(0,0,0,0.30)' : 'rgba(255,255,255,0.60)', border: `1px solid ${th.headerBorder}`, color: th.headerTitle }}>
                    {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                  </div>
                </div>
                <p className="mt-1" style={{ color: th.headerSub }}>
                  {vouchers.length} vouchers loaded{hasMore && ' • Scroll to load more'}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={handleRefresh}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg backdrop-blur-sm transition-all"
                  style={{ background: th.headerBtnBg, border: `1px solid ${th.headerBtnBorder}`, color: th.headerBtnText }}>
                  <RefreshCw className="h-4 w-4" />Refresh
                </button>
                <button onClick={downloadVouchersCSV}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg backdrop-blur-sm transition-all"
                  style={{ background: th.headerBtnBg, border: `1px solid ${th.headerBtnBorder}`, color: th.headerBtnText }}>
                  <FileDown className="h-4 w-4" />Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[180px] md:pt-6 pb-6">

          {/* Desktop Filters */}
          <div className="hidden md:block rounded-xl p-3 mb-4 transition-colors duration-500"
            style={{ background: th.filterPanelBg, border: `1px solid ${th.filterPanelBorder}` }}>
            <div className="grid grid-cols-5 gap-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4" style={{ color: th.filterIcon }} />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search vouchers..."
                  className="w-full pl-8 pr-3 py-2 text-sm rounded"
                  style={selectStyle} />
              </div>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="px-3 py-2 text-sm rounded appearance-none" style={selectStyle}>
                <option value="all">All Types</option>
                <option value="payment">Payment</option>
                <option value="receipt">Receipt</option>
                <option value="journal">Journal</option>
                <option value="contra">Contra</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-sm rounded appearance-none" style={selectStyle}>
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="posted">Posted</option>
                <option value="approved">Approved</option>
                <option value="void">Void</option>
              </select>
              <select value={sortConfig.key} onChange={e => handleSort(e.target.value)}
                className="px-3 py-2 text-sm rounded appearance-none" style={selectStyle}>
                <option value="date">Sort by Date</option>
                <option value="amount">Sort by Amount</option>
                <option value="voucherNumber">Sort by Voucher #</option>
              </select>
              <button onClick={clearFilters} className="px-4 py-2 text-sm rounded transition-colors"
                style={{ background: th.filterInputBg, border: `1px solid ${th.filterInputBorder}`, color: th.filterInputText }}>
                Clear All
              </button>
            </div>
          </div>

          {/* Quick Actions - Mobile */}
          <div className="md:hidden grid grid-cols-2 gap-3 mb-6">
            {voucherTypes.map(type => (
              <button key={type.value} onClick={() => router.push(type.href)}
                className="p-4 rounded-2xl transition-all active:scale-[0.98]"
                style={{ background: th.quickCardBg, border: `1px solid ${th.quickCardBorder}` }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = th.cardHoverBorder)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = th.quickCardBorder)}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: th.cardTitle }}>{type.label}</h3>
                    <p className="text-xs mt-0.5" style={{ color: th.cardMuted }}>Create</p>
                  </div>
                  {getVoucherTypeIcon(type.value)}
                </div>
              </button>
            ))}
          </div>

          {/* Quick Actions - Desktop */}
          <div className="hidden md:grid grid-cols-3 gap-4 mb-6">
            {voucherTypes.map(type => (
              <button key={type.value} onClick={() => router.push(type.href)}
                className="p-6 rounded-xl transition-all text-left"
                style={{ background: th.quickCardBg, border: `1px solid ${th.quickCardBorder}` }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = th.cardHoverBorder)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = th.quickCardBorder)}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold" style={{ color: th.cardTitle }}>{type.label}</h3>
                    <p className="text-sm mt-1" style={{ color: th.cardMuted }}>Create new</p>
                  </div>
                  {getVoucherTypeIcon(type.value)}
                </div>
              </button>
            ))}
          </div>
          
          {/* Vouchers List - Mobile */}
          <div className="md:hidden">
            {loading && vouchers.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E84545]"></div>
              </div>
            ) : sortedVouchers.length === 0 ? (
              <div className="rounded-2xl p-8 text-center transition-colors"
                style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                <FileText className="h-12 w-12 mx-auto mb-4" style={{ color: th.emptyIcon }} />
                <p className="text-lg font-medium" style={{ color: th.emptyText }}>No vouchers found</p>
                <p className="text-sm mt-1" style={{ color: th.cardMuted }}>Try adjusting your filters</p>
                {(filterType !== 'all' || filterStatus !== 'all' || searchTerm) && (
                  <button onClick={clearFilters}
                    className="mt-4 px-4 py-2 text-white text-sm font-semibold rounded-lg"
                    style={{ background: 'linear-gradient(to right,#E84545,#cc3c3c)' }}>
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {sortedVouchers.map(voucher => (
                    <div key={voucher._id}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(`/autocityPro/vouchers/${voucher._id}`); }}
                      onClick={() => router.push(`/autocityPro/vouchers/${voucher._id}`)}
                      className="rounded-xl p-4 cursor-pointer transition-all active:scale-[0.98]"
                      style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = th.cardHoverBorder)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = th.cardBorder)}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {getVoucherTypeIcon(voucher.voucherType)}
                            <span className="text-sm font-semibold" style={{ color: th.cardTitle }}>{voucher.voucherNumber}</span>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full border flex items-center gap-1 ${getStatusColor(voucher.status)}`}>
                              {getStatusIcon(voucher.status)}
                              <span className="capitalize">{voucher.status}</span>
                            </span>
                          </div>
                          <p className="text-xs" style={{ color: th.cardMuted }}>{new Date(voucher.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="space-y-2 py-3" style={{ borderTop: `1px solid ${th.tableBorder}` }}>
                        <p className="text-sm line-clamp-2" style={{ color: th.cardSubtext }}>{voucher.narration}</p>
                        {voucher.referenceNumber && (
                          <p className="text-xs" style={{ color: th.cardMuted }}>Ref: {voucher.referenceNumber}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-3" style={{ borderTop: `1px solid ${th.tableBorder}` }}>
                        <div>
                          <span className="text-[10px] uppercase block mb-1" style={{ color: th.cardMuted }}>Type</span>
                          <p className="text-sm font-semibold capitalize" style={{ color: th.cardSubtext }}>{voucher.voucherType}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase block mb-1" style={{ color: th.cardMuted }}>Amount</span>
                          <p className="text-sm font-bold" style={{ color: th.cardTitle }}>QAR {voucher.totalDebit?.toLocaleString() || '0'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {loadingMore && (
                  <div className="flex justify-center py-6">
                    <div className="flex items-center gap-2" style={{ color: th.cardMuted }}>
                      <Loader2 className="h-5 w-5 animate-spin text-[#E84545]" />
                      <span className="text-sm">Loading more...</span>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} className="h-20 flex items-center justify-center">
                  {!hasMore && vouchers.length > 0 && (
                    <p className="text-xs" style={{ color: th.emptyText }}>All {vouchers.length} vouchers loaded</p>
                  )}
                </div>
              </>
            )}
          </div>
          
          {/* Vouchers Table - Desktop */}
          <div className="hidden md:block rounded-xl overflow-hidden transition-colors duration-500"
            style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
            <table className="min-w-full divide-y text-sm" style={{ borderColor: th.tableBorder }}>
              <thead>
                <tr style={{ background: th.tableHeaderBg }}>
                  {[
                    { label: 'Voucher #', key: 'voucherNumber' },
                    { label: 'Type', key: null },
                    { label: 'Date', key: 'date' },
                    { label: 'Narration', key: null },
                    { label: 'Amount', key: 'amount' },
                    { label: 'Status', key: null },
                    { label: 'Actions', key: null },
                  ].map(h => (
                    <th key={h.label}
                      className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${h.key ? 'cursor-pointer' : ''}`}
                      style={{ color: th.tableHeaderText }}
                      onClick={() => h.key && handleSort(h.key)}>
                      <div className="flex items-center">
                        {h.label}{h.key && getSortIcon(h.key)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && vouchers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E84545] mx-auto mb-2"></div>
                      <p style={{ color: th.emptyText }}>Loading vouchers...</p>
                    </td>
                  </tr>
                ) : sortedVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <FileText className="h-16 w-16 mx-auto mb-4" style={{ color: th.emptyIcon }} />
                      <p className="text-lg font-medium" style={{ color: th.emptyText }}>No vouchers found</p>
                      {(filterType !== 'all' || filterStatus !== 'all' || searchTerm) && (
                        <button onClick={clearFilters}
                          className="mt-4 px-4 py-2 text-white text-sm font-semibold rounded-lg"
                          style={{ background: 'linear-gradient(to right,#E84545,#cc3c3c)' }}>
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  sortedVouchers.map(voucher => (
                    <tr key={voucher._id} className="transition-colors"
                      style={{ borderTop: `1px solid ${th.tableBorder}` }}
                      onMouseEnter={el => (el.currentTarget.style.background = th.tableRowHover)}
                      onMouseLeave={el => (el.currentTarget.style.background = 'transparent')}>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-[#E84545]">{voucher.voucherNumber}</p>
                        {voucher.referenceNumber && (
                          <p className="text-xs mt-0.5" style={{ color: th.cardMuted }}>Ref: {voucher.referenceNumber}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getVoucherTypeIcon(voucher.voucherType)}
                          <span className="text-sm capitalize" style={{ color: th.cardSubtext }}>{voucher.voucherType}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: th.cardSubtext }}>
                        {new Date(voucher.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm line-clamp-2 max-w-xs" style={{ color: th.cardSubtext }}>{voucher.narration}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold" style={{ color: th.cardTitle }}>
                          QAR {voucher.totalDebit?.toLocaleString() || '0'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full border ${getStatusColor(voucher.status)}`}>
                          {getStatusIcon(voucher.status)}
                          <span className="capitalize">{voucher.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => router.push(`/autocityPro/vouchers/${voucher._id}`)}
                            className="p-2 rounded-lg transition-all"
                            style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.actionBtnText }}>
                            <Eye className="h-4 w-4" />
                          </button>
                          {voucher.status === 'draft' && (
                            <>
                              <button onClick={() => router.push(`/autocityPro/vouchers/${voucher._id}/edit`)}
                                className="p-2 rounded-lg transition-all"
                                style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.actionBtnText }}>
                                <Edit className="h-4 w-4" />
                              </button>
                              <button onClick={e => { e.stopPropagation(); handleDeleteVoucher(voucher._id, voucher.voucherNumber); }}
                                className="p-2 rounded-lg transition-all"
                                style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: '#E84545' }}>
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {loadingMore && (
              <div className="flex justify-center py-6" style={{ borderTop: `1px solid ${th.tableBorder}` }}>
                <div className="flex items-center gap-2" style={{ color: th.cardMuted }}>
                  <Loader2 className="h-5 w-5 animate-spin text-[#E84545]" />
                  <span className="text-sm">Loading more vouchers...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} className="h-1" />

            {!hasMore && vouchers.length > 0 && (
              <div className="text-center py-6" style={{ borderTop: `1px solid ${th.tableBorder}` }}>
                <p className="text-sm" style={{ color: th.emptyText }}>All {vouchers.length} vouchers loaded</p>
              </div>
            )}
          </div>
        </div>

        <div className="md:hidden h-20"></div>
      </div>

      {/* Mobile Filter Modal */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom duration-300"
            style={{ background: th.modalBg, borderColor: th.modalBorder }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: th.modalTitle }}>Filters & Sort</h2>
              <button onClick={() => setShowFilters(false)} className="p-2 rounded-xl"
                style={{ background: th.modalCloseBg, color: th.modalCloseText }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Voucher Type', val: filterType, set: setFilterType, opts: [['all','All Types'],['payment','Payment'],['receipt','Receipt'],['journal','Journal'],['contra','Contra']] },
                { label: 'Status', val: filterStatus, set: setFilterStatus, opts: [['all','All Status'],['draft','Draft'],['posted','Posted'],['approved','Approved'],['void','Void']] },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-sm font-medium mb-2" style={{ color: th.modalLabel }}>{f.label}</label>
                  <select value={f.val} onChange={e => f.set(e.target.value)} className="w-full px-3 py-3 rounded-xl"
                    style={{ background: th.modalSelectBg, border: `1px solid ${th.modalSelectBorder}`, color: th.modalSelectText }}>
                    {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
              <div className="flex gap-3 pt-4" style={{ borderTop: `1px solid ${th.modalBorder}` }}>
                <button onClick={() => { clearFilters(); setShowFilters(false); }}
                  className="flex-1 px-4 py-3 rounded-xl"
                  style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.actionBtnText }}>
                  Clear All
                </button>
                <button onClick={() => setShowFilters(false)}
                  className="flex-1 px-4 py-3 rounded-xl text-white font-semibold"
                  style={{ background: 'linear-gradient(to right,#E84545,#cc3c3c)' }}>
                  Apply
                </button>
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
                style={{ background: th.modalCloseBg, color: th.modalCloseText }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {voucherTypes.map(type => (
                <button key={type.value} onClick={() => { router.push(type.href); setShowMobileMenu(false); }}
                  className="w-full p-4 rounded-xl font-semibold flex items-center gap-3 active:scale-95 transition-all"
                  style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.actionBtnText }}>
                  {getVoucherTypeIcon(type.value)}
                  <span>Create {type.label}</span>
                </button>
              ))}
              <button onClick={() => { downloadVouchersCSV(); setShowMobileMenu(false); }}
                className="w-full p-4 rounded-xl font-semibold flex items-center justify-between active:scale-95 transition-all"
                style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.actionBtnText }}>
                <span>Export CSV</span><FileDown className="h-5 w-5" />
              </button>
              <button onClick={() => { handleRefresh(); setShowMobileMenu(false); }}
                className="w-full p-4 rounded-xl font-semibold flex items-center justify-between active:scale-95 transition-all"
                style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.actionBtnText }}>
                <span>Refresh Data</span><RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}