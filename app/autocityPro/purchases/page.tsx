// app/autocityPro/purchases/page.tsx - WITH TIME-BASED LIGHT/DARK THEME
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Eye,
  Download,
  Calendar,
  TrendingUp,
  Package,
  DollarSign,
  ChevronLeft,
  X,
  Clock,
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Users,
  ChevronRight,
  BarChart3,
  Activity,
  Star,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Printer,
  Trash2,
  Layers,
  Wallet,
  Receipt,
  Building2,
  Sun,
  Moon,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Time-based theme hook ────────────────────────────────────────────────────
function useTimeBasedTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => {
      const hour = new Date().getHours();
      setIsDark(hour < 6 || hour >= 18);
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);
  return isDark;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Purchase {
  _id: string;
  purchaseNumber: string;
  purchaseDate: string;
  supplierName: string;
  items: any[];
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Supplier {
  _id: string;
  name: string;
}

type ViewMode = 'grid' | 'list' | 'compact';
type SortField = 'date' | 'amount' | 'supplier' | 'status' | 'balance';
type SortOrder = 'asc' | 'desc';

export default function PurchasesPage() {
  const router = useRouter();
  const isDark = useTimeBasedTheme();

  const [user, setUser] = useState<User | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [allPurchases, setAllPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('unpaid');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedPurchases, setSelectedPurchases] = useState<Set<string>>(new Set());
  const [quickDateFilter, setQuickDateFilter] = useState('all');
  const [showExportModal, setShowExportModal] = useState(false);

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    // Page
    pageBg:           isDark ? 'linear-gradient(135deg,#050505,#0A0A0A,#050505)' : 'linear-gradient(135deg,#f3f4f6,#f9fafb,#f3f4f6)',
    // Desktop header
    desktopHeaderBg:  isDark ? 'linear-gradient(135deg,#1a0a0a,#411010,#0A0A0A)' : 'linear-gradient(135deg,#fef2f2,#fee2e2,#fef9f9)',
    desktopHeaderBorder: isDark ? 'rgba(255,255,255,0.10)'                       : 'rgba(0,0,0,0.08)',
    headerTitle:      isDark ? '#ffffff'                                          : '#7f1d1d',
    headerSub:        isDark ? 'rgba(255,255,255,0.70)'                          : '#991b1b',
    headerBtnBg:      isDark ? 'rgba(255,255,255,0.05)'                          : 'rgba(0,0,0,0.06)',
    headerBtnBorder:  isDark ? 'rgba(255,255,255,0.10)'                          : 'rgba(0,0,0,0.10)',
    headerBtnText:    isDark ? '#9ca3af'                                          : '#6b7280',
    // Mobile header
    mobileHeaderBg:   isDark ? 'linear-gradient(180deg,#000000,#0A0A0A,transparent)' : 'linear-gradient(180deg,#ffffff,#f9fafb,transparent)',
    mobileHeaderBorder: isDark ? 'rgba(255,255,255,0.05)'                        : 'rgba(0,0,0,0.08)',
    mobileHeaderTitle: isDark ? '#ffffff'                                         : '#111827',
    mobileHeaderSub:  isDark ? 'rgba(255,255,255,0.60)'                          : '#6b7280',
    mobileBtnBg:      isDark ? 'rgba(255,255,255,0.05)'                          : 'rgba(0,0,0,0.05)',
    mobileBtnBorder:  isDark ? 'rgba(255,255,255,0.10)'                          : 'rgba(0,0,0,0.10)',
    mobileBtnText:    isDark ? 'rgba(255,255,255,0.80)'                          : '#374151',
    // Cards / panels
    cardBg:           isDark ? 'linear-gradient(135deg,#0A0A0A,#050505)'         : 'linear-gradient(135deg,#ffffff,#f9fafb)',
    cardBorder:       isDark ? 'rgba(255,255,255,0.10)'                          : 'rgba(0,0,0,0.08)',
    cardBorderHover:  isDark ? 'rgba(232,69,69,0.30)'                            : 'rgba(232,69,69,0.25)',
    cardHoverOverlay: isDark ? 'rgba(232,69,69,0.05)'                            : 'rgba(232,69,69,0.03)',
    // Text
    textPrimary:      isDark ? '#ffffff'                                          : '#111827',
    textSecondary:    isDark ? '#9ca3af'                                          : '#6b7280',
    textMuted:        isDark ? '#6b7280'                                          : '#9ca3af',
    // Inputs / selects
    inputBg:          isDark ? 'rgba(255,255,255,0.05)'                          : 'rgba(0,0,0,0.04)',
    inputBorder:      isDark ? 'rgba(255,255,255,0.10)'                          : 'rgba(0,0,0,0.10)',
    inputText:        isDark ? '#ffffff'                                          : '#111827',
    inputPH:          isDark ? '#6b7280'                                          : '#9ca3af',
    // Dividers
    divider:          isDark ? 'rgba(255,255,255,0.05)'                          : 'rgba(0,0,0,0.06)',
    dividerStrong:    isDark ? 'rgba(255,255,255,0.10)'                          : 'rgba(0,0,0,0.10)',
    // Toggle bg (unpaid/all)
    toggleBg:         isDark ? 'rgba(255,255,255,0.05)'                          : 'rgba(0,0,0,0.05)',
    toggleBorder:     isDark ? 'rgba(255,255,255,0.10)'                          : 'rgba(0,0,0,0.08)',
    toggleInactive:   isDark ? '#9ca3af'                                          : '#6b7280',
    // Stat inner card
    statInnerBg:      isDark ? 'rgba(255,255,255,0.05)'                          : 'rgba(0,0,0,0.04)',
    statInnerBorder:  isDark ? 'rgba(255,255,255,0.05)'                          : 'rgba(0,0,0,0.06)',
    // Table head
    tableHeadBg:      isDark ? 'rgba(255,255,255,0.05)'                          : '#f3f4f6',
    tableHeadText:    isDark ? '#9ca3af'                                          : '#6b7280',
    tableRowHover:    isDark ? 'rgba(255,255,255,0.05)'                          : 'rgba(0,0,0,0.02)',
    tableRowDivider:  isDark ? 'rgba(255,255,255,0.05)'                          : 'rgba(0,0,0,0.06)',
    // Modal overlay
    modalOverlay:     isDark ? 'rgba(0,0,0,0.80)'                                : 'rgba(0,0,0,0.50)',
    modalBg:          isDark ? 'linear-gradient(180deg,#0A0A0A,#050505)'         : 'linear-gradient(180deg,#ffffff,#f9fafb)',
    modalBorder:      isDark ? 'rgba(255,255,255,0.10)'                          : 'rgba(0,0,0,0.08)',
    modalTitle:       isDark ? '#ffffff'                                          : '#111827',
    modalCloseBg:     isDark ? 'rgba(255,255,255,0.05)'                          : 'rgba(0,0,0,0.05)',
    modalCloseText:   isDark ? '#9ca3af'                                          : '#6b7280',
    // Empty state
    emptyIconBg:      isDark ? 'rgba(255,255,255,0.05)'                          : 'rgba(0,0,0,0.05)',
    emptyIcon:        isDark ? '#4b5563'                                          : '#d1d5db',
    emptyText:        isDark ? '#9ca3af'                                          : '#6b7280',
    // Quick date pills
    quickActiveBg:    '#E84545',
    quickActiveText:  '#ffffff',
    quickInactiveBg:  isDark ? 'rgba(255,255,255,0.05)'                          : 'rgba(0,0,0,0.05)',
    quickInactiveText: isDark ? '#9ca3af'                                         : '#6b7280',
    // Bulk bar
    bulkBarBg:        isDark ? 'linear-gradient(90deg,rgba(232,69,69,0.10),rgba(168,85,247,0.10))' : 'linear-gradient(90deg,rgba(232,69,69,0.07),rgba(168,85,247,0.07))',
    bulkBarBorder:    isDark ? 'rgba(232,69,69,0.20)'                            : 'rgba(232,69,69,0.20)',
    // Export modal
    exportItemBg:     isDark ? 'rgba(255,255,255,0.05)'                          : 'rgba(0,0,0,0.04)',
    exportItemBorder: isDark ? 'rgba(255,255,255,0.10)'                          : 'rgba(0,0,0,0.08)',
    // Summary footer
    summaryCardBorder: isDark ? 'rgba(255,255,255,0.10)'                         : 'rgba(0,0,0,0.08)',
    // Analytics badge
    analyticsBtnActive: isDark ? 'rgba(232,69,69,0.10)'                          : 'rgba(232,69,69,0.08)',
    analyticsBtnActiveBorder: isDark ? 'rgba(232,69,69,0.20)'                   : 'rgba(232,69,69,0.20)',
    analyticsBtnInactiveBg: isDark ? 'rgba(255,255,255,0.05)'                   : 'rgba(0,0,0,0.05)',
    analyticsBtnInactiveBorder: isDark ? 'rgba(255,255,255,0.10)'               : 'rgba(0,0,0,0.08)',
  };

  // Shared input class (className portion, style is separate)
  const inputClass = 'focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 focus:border-[#E84545]/50 text-sm';
  const inputStyle = { background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText };

  useEffect(() => {
    const checkIfMobile = () => setIsMobile(window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  useEffect(() => {
    fetchUser();
    fetchPurchases();
    fetchSuppliers();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) setUser((await res.json()).user);
    } catch {}
  };

  const fetchPurchases = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true); else setRefreshing(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (supplierFilter !== 'all') params.append('supplierId', supplierFilter);
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      const res = await fetch(`/api/purchases?${params}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const fetched = data.purchases || [];
        setAllPurchases(fetched);
        setPurchases(fetched);
        toast.success('Purchases loaded');
      } else toast.error('Failed to fetch purchases');
    } catch { toast.error('Failed to fetch purchases'); }
    finally { if (showLoading) setLoading(false); else setRefreshing(false); }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/suppliers', { credentials: 'include' });
      if (res.ok) setSuppliers((await res.json()).suppliers || []);
    } catch {}
  };

  useEffect(() => { fetchPurchases(); }, [statusFilter, supplierFilter, dateRange]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };

  const handleRefresh = () => fetchPurchases(false);

  const applyQuickDateFilter = (filter: string) => {
    setQuickDateFilter(filter);
    const today = new Date();
    let startDate = new Date();
    switch (filter) {
      case 'today':  startDate = new Date(today); break;
      case 'week':   startDate.setDate(today.getDate() - 7); break;
      case 'month':  startDate.setMonth(today.getMonth() - 1); break;
      case 'quarter':startDate.setMonth(today.getMonth() - 3); break;
      case 'year':   startDate.setFullYear(today.getFullYear() - 1); break;
      default: setDateRange({ startDate: '', endDate: '' }); return;
    }
    setDateRange({ startDate: startDate.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] });
  };

  const filteredAndSortedPurchases = useMemo(() => {
    let filtered = purchases.filter(p => {
      const matchesSearch = p.purchaseNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || p.supplierName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPaymentMethod = paymentMethodFilter === 'all' || p.paymentMethod === paymentMethodFilter;
      const matchesPaymentStatus = paymentStatusFilter === 'all' || (paymentStatusFilter === 'unpaid' && p.balanceDue > 0) || (paymentStatusFilter === 'paid' && p.balanceDue === 0);
      return matchesSearch && matchesPaymentMethod && matchesPaymentStatus;
    });
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':     comparison = new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime(); break;
        case 'amount':   comparison = a.grandTotal - b.grandTotal; break;
        case 'supplier': comparison = a.supplierName.localeCompare(b.supplierName); break;
        case 'status':   comparison = a.status.localeCompare(b.status); break;
        case 'balance':  comparison = a.balanceDue - b.balanceDue; break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return filtered;
  }, [purchases, searchTerm, paymentMethodFilter, paymentStatusFilter, sortField, sortOrder]);

  const stats = useMemo(() => {
    const statsBase = allPurchases.filter(p => {
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesSupplier = supplierFilter === 'all' || p.supplierName === supplierFilter;
      const matchesPaymentMethod = paymentMethodFilter === 'all' || p.paymentMethod === paymentMethodFilter;
      let matchesDateRange = true;
      if (dateRange.startDate || dateRange.endDate) {
        const pd = new Date(p.purchaseDate);
        if (dateRange.startDate) matchesDateRange = matchesDateRange && pd >= new Date(dateRange.startDate);
        if (dateRange.endDate)   matchesDateRange = matchesDateRange && pd <= new Date(dateRange.endDate);
      }
      return matchesStatus && matchesSupplier && matchesPaymentMethod && matchesDateRange;
    });
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentPurchases = statsBase.filter(p => new Date(p.purchaseDate) >= thirtyDaysAgo);
    const supplierTotals = statsBase.reduce((acc, p) => { acc[p.supplierName] = (acc[p.supplierName] || 0) + p.grandTotal; return acc; }, {} as Record<string, number>);
    const overduePayments = statsBase.filter(p => p.balanceDue > 0);
    return {
      total: statsBase.length,
      totalAmount: statsBase.reduce((s, p) => s + (p.grandTotal || 0), 0),
      totalPaid: statsBase.reduce((s, p) => s + (p.amountPaid || 0), 0),
      totalDue: statsBase.reduce((s, p) => s + (p.balanceDue || 0), 0),
      completed: statsBase.filter(p => p.status === 'COMPLETED').length,
      draft: statsBase.filter(p => p.status === 'DRAFT').length,
      cancelled: statsBase.filter(p => p.status === 'CANCELLED').length,
      overduePayments: overduePayments.length,
      overdueAmount: overduePayments.reduce((s, p) => s + p.balanceDue, 0),
      averageOrderValue: statsBase.length > 0 ? statsBase.reduce((s, p) => s + p.grandTotal, 0) / statsBase.length : 0,
      recentPurchasesCount: recentPurchases.length,
      recentAmount: recentPurchases.reduce((s, p) => s + p.grandTotal, 0),
      topSuppliers: Object.entries(supplierTotals).sort(([,a],[,b]) => b-a).slice(0,5).map(([name,total]) => ({ name, total })),
      totalItems: statsBase.reduce((s, p) => s + (p.items?.length || 0), 0),
    };
  }, [allPurchases, statusFilter, supplierFilter, paymentMethodFilter, dateRange]);

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-QA', { style: 'currency', currency: 'QAR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  const formatCompactCurrency = (n: number) => n >= 1_000_000 ? `QR${(n/1_000_000).toFixed(1)}M` : n >= 10_000 ? `QR${(n/1_000).toFixed(1)}K` : formatCurrency(n);

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED': return isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DRAFT':     return isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'       : 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CANCELLED': return isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'           : 'bg-rose-50 text-rose-700 border-rose-200';
      default:          return isDark ? 'bg-gray-500/10 text-gray-400 border-gray-500/20'           : 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED': return <CheckCircle className="h-3.5 w-3.5" />;
      case 'DRAFT':     return <Clock className="h-3.5 w-3.5" />;
      case 'CANCELLED': return <XCircle className="h-3.5 w-3.5" />;
      default:          return <AlertCircle className="h-3.5 w-3.5" />;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    const colors: Record<string, string> = isDark ? {
      CASH:          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      CARD:          'bg-blue-500/10 text-blue-400 border-blue-500/20',
      BANK_TRANSFER: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      CREDIT:        'bg-orange-500/10 text-orange-400 border-orange-500/20',
    } : {
      CASH:          'bg-emerald-50 text-emerald-700 border-emerald-200',
      CARD:          'bg-blue-50 text-blue-700 border-blue-200',
      BANK_TRANSFER: 'bg-purple-50 text-purple-700 border-purple-200',
      CREDIT:        'bg-orange-50 text-orange-700 border-orange-200',
    };
    return colors[method] || (isDark ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' : 'bg-gray-50 text-gray-600 border-gray-200');
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'CASH':          return <Wallet className="h-3 w-3" />;
      case 'CARD':          return <CreditCard className="h-3 w-3" />;
      case 'BANK_TRANSFER': return <Building2 className="h-3 w-3" />;
      case 'CREDIT':        return <Receipt className="h-3 w-3" />;
      default:              return <DollarSign className="h-3 w-3" />;
    }
  };

  const clearFilters = () => {
    setSearchTerm(''); setStatusFilter('all'); setSupplierFilter('all');
    setPaymentMethodFilter('all'); setPaymentStatusFilter('unpaid');
    setDateRange({ startDate: '', endDate: '' }); setQuickDateFilter('all'); setShowFilters(false);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
  };

  const toggleSelectPurchase = (id: string) => {
    const s = new Set(selectedPurchases);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedPurchases(s);
  };

  const selectAllPurchases = () => {
    setSelectedPurchases(selectedPurchases.size === filteredAndSortedPurchases.length
      ? new Set()
      : new Set(filteredAndSortedPurchases.map(p => p._id)));
  };

  const handleBulkExport = () => { toast.success(`Exporting ${selectedPurchases.size} purchases...`); setSelectedPurchases(new Set()); };
  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedPurchases.size} purchases?`)) {
      toast.success(`Deleted ${selectedPurchases.size} purchases`); setSelectedPurchases(new Set());
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center transition-colors duration-500" style={{ background: th.pageBg }}>
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-t-[#E84545] mx-auto" style={{ borderColor: `${th.divider} ${th.divider} ${th.divider} #E84545` }}></div>
            <ShoppingCart className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-[#E84545]" />
          </div>
          <p className="mt-6 text-lg font-semibold" style={{ color: th.textPrimary }}>Loading Purchases</p>
          <p className="text-sm mt-2" style={{ color: th.textSecondary }}>Preparing your purchase data...</p>
        </div>
      </div>
    );
  }

  // Reusable payment toggle component (inline)
  const PaymentToggle = ({ compact = false }: { compact?: boolean }) => (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${compact ? 'flex-1' : ''}`}
      style={{ background: th.toggleBg, borderColor: th.toggleBorder }}>
      <button
        onClick={() => setPaymentStatusFilter('unpaid')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${compact ? 'flex-1 justify-center' : ''} ${paymentStatusFilter === 'unpaid' ? 'bg-[#E84545] text-white shadow-lg' : ''}`}
        style={paymentStatusFilter !== 'unpaid' ? { color: th.toggleInactive } : {}}
      >
        <AlertCircle className="h-3 w-3" />
        Unpaid ({allPurchases.filter(p => p.balanceDue > 0).length})
      </button>
      <div className="h-4 w-px" style={{ background: th.dividerStrong }} />
      <button
        onClick={() => setPaymentStatusFilter('all')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${compact ? 'flex-1 justify-center' : ''} ${paymentStatusFilter === 'all' ? 'bg-[#E84545] text-white shadow-lg' : ''}`}
        style={paymentStatusFilter !== 'all' ? { color: th.toggleInactive } : {}}
      >
        <FileText className="h-3 w-3" />
        All ({allPurchases.length})
      </button>
    </div>
  );

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b transition-colors duration-500"
          style={{ background: th.mobileHeaderBg, borderColor: th.mobileHeaderBorder }}>
          <div className="px-4 py-3 pt-safe">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()}
                  className="p-2.5 rounded-xl active:scale-95 transition-all border"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText, borderColor: th.mobileBtnBorder }}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: th.mobileHeaderTitle }}>
                    <ShoppingCart className="h-5 w-5 text-[#E84545]" />
                    Purchases
                    {isDark ? <Moon className="h-3.5 w-3.5 text-[#E84545] ml-1" /> : <Sun className="h-3.5 w-3.5 text-[#E84545] ml-1" />}
                  </h1>
                  <p className="text-xs" style={{ color: th.mobileHeaderSub }}>
                    {filteredAndSortedPurchases.length} {paymentStatusFilter === 'unpaid' ? 'unpaid' : 'total'} • {formatCompactCurrency(stats.totalAmount)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowAnalytics(!showAnalytics)}
                  className="p-2.5 rounded-xl active:scale-95 transition-all border"
                  style={{
                    background: showAnalytics ? th.analyticsBtnActive : th.analyticsBtnInactiveBg,
                    color: showAnalytics ? '#E84545' : th.mobileBtnText,
                    borderColor: showAnalytics ? th.analyticsBtnActiveBorder : th.mobileBtnBorder
                  }}>
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button onClick={() => router.push('/autocityPro/purchases/new')}
                  className="p-2.5 rounded-xl active:scale-95 transition-all shadow-lg border border-[#E84545]/20 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Payment Status Toggle - Mobile */}
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => setPaymentStatusFilter('unpaid')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${paymentStatusFilter === 'unpaid' ? 'bg-[#E84545] text-white shadow-lg' : ''}`}
                style={paymentStatusFilter !== 'unpaid' ? { background: th.mobileBtnBg, color: th.textSecondary } : {}}>
                <AlertCircle className="h-4 w-4" />Unpaid ({allPurchases.filter(p => p.balanceDue > 0).length})
              </button>
              <button onClick={() => setPaymentStatusFilter('all')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${paymentStatusFilter === 'all' ? 'bg-[#E84545] text-white shadow-lg' : ''}`}
                style={paymentStatusFilter !== 'all' ? { background: th.mobileBtnBg, color: th.textSecondary } : {}}>
                <FileText className="h-4 w-4" />All ({allPurchases.length})
              </button>
            </div>

            {showAnalytics && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { icon: <CheckCircle className="h-3 w-3 text-emerald-400" />, label: 'Completed', value: stats.completed, valueColor: th.textPrimary },
                  { icon: <AlertCircle className="h-3 w-3 text-orange-400" />, label: 'Balance', value: formatCompactCurrency(stats.totalDue), valueColor: '#fb923c' },
                  { icon: <Package className="h-3 w-3 text-blue-400" />, label: 'Items', value: stats.totalItems, valueColor: th.textPrimary },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-2.5 backdrop-blur-sm border transition-colors duration-500"
                    style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                    <div className="flex items-center gap-1.5 mb-1">{s.icon}<span className="text-[10px] font-medium" style={{ color: th.textSecondary }}>{s.label}</span></div>
                    <p className="text-base font-bold" style={{ color: s.valueColor }}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: th.inputPH }} />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search purchases..." className={`w-full pl-10 pr-4 py-2.5 rounded-xl ${inputClass}`}
                  style={inputStyle} />
              </div>
              <button onClick={() => setShowFilters(true)} className="p-2.5 rounded-xl active:scale-95 transition-all border relative backdrop-blur-sm"
                style={{ background: th.mobileBtnBg, color: th.mobileBtnText, borderColor: th.mobileBtnBorder }}>
                <Filter className="h-4 w-4" />
                {(statusFilter !== 'all' || supplierFilter !== 'all' || paymentMethodFilter !== 'all' || dateRange.startDate) && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-[#E84545] rounded-full border-2" style={{ borderColor: isDark ? '#000' : '#fff' }} />
                )}
              </button>
              <button onClick={handleRefresh} disabled={refreshing}
                className="p-2.5 rounded-xl active:scale-95 transition-all border backdrop-blur-sm disabled:opacity-50"
                style={{ background: th.mobileBtnBg, color: th.mobileBtnText, borderColor: th.mobileBtnBorder }}>
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
              {['all', 'today', 'week', 'month', 'quarter', 'year'].map(f => (
                <button key={f} onClick={() => applyQuickDateFilter(f)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                  style={{ background: quickDateFilter === f ? th.quickActiveBg : th.quickInactiveBg, color: quickDateFilter === f ? th.quickActiveText : th.quickInactiveText }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-11 border-b shadow-2xl relative overflow-hidden transition-colors duration-500"
          style={{ background: th.desktopHeaderBg, borderColor: th.desktopHeaderBorder }}>
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
            backgroundSize: '40px 40px',
            color: isDark ? '#fff' : '#000',
          }} />
          <div className="max-w-[1400px] mx-auto px-6 relative z-10">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-[#E84545] to-[#cc3c3c] rounded-2xl shadow-xl">
                  <ShoppingCart className="h-7 w-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold tracking-tight" style={{ color: th.headerTitle }}>Purchase Management</h1>
                    {isDark ? <Moon className="h-4 w-4 text-[#E84545]" /> : <Sun className="h-4 w-4 text-[#E84545]" />}
                  </div>
                  <p className="mt-1" style={{ color: th.headerSub }}>Track and manage all your purchase orders</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleRefresh} disabled={refreshing}
                  className="p-3 rounded-xl transition-all disabled:opacity-50 border hover:border-[#E84545]/30"
                  style={{ background: th.headerBtnBg, borderColor: th.headerBtnBorder }}>
                  <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} style={{ color: th.headerBtnText }} />
                </button>
                <button onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all border hover:border-[#E84545]/30"
                  style={{ background: th.headerBtnBg, borderColor: th.headerBtnBorder, color: th.textPrimary }}>
                  <Download className="h-4 w-4" />Export
                </button>
                <button onClick={() => router.push('/autocityPro/purchases/new')}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-xl">
                  <Plus className="h-5 w-5" />New Purchase Order
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-[320px] md:pt-6 pb-6">

          {/* Analytics Dashboard - Desktop */}
          {!isMobile && showAnalytics && (
            <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 grid grid-cols-4 gap-4">
                {[
                  {
                    icon: <div className="p-3 bg-gradient-to-br from-[#E84545] to-[#cc3c3c] rounded-xl shadow-lg"><ShoppingCart className="h-5 w-5 text-white" /></div>,
                    trendIcon: <TrendingUp className="h-4 w-4 text-emerald-400" />,
                    label: 'Total Orders', value: stats.total,
                    sub: <span className="text-xs text-emerald-400">↑ {stats.recentPurchasesCount} this month</span>,
                    hoverBorder: isDark ? 'rgba(232,69,69,0.30)' : 'rgba(232,69,69,0.25)',
                  },
                  {
                    icon: <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg"><DollarSign className="h-5 w-5 text-white" /></div>,
                    trendIcon: <Activity className="h-4 w-4 text-emerald-400" />,
                    label: 'Total Value', value: formatCompactCurrency(stats.totalAmount),
                    sub: <span className="text-xs" style={{ color: th.textMuted }}>Avg: {formatCompactCurrency(stats.averageOrderValue)}</span>,
                    hoverBorder: isDark ? 'rgba(16,185,129,0.30)' : 'rgba(16,185,129,0.25)',
                  },
                  {
                    icon: <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg"><CheckCircle className="h-5 w-5 text-white" /></div>,
                    trendIcon: <CheckCircle className="h-4 w-4 text-blue-400" />,
                    label: 'Total Paid', value: formatCompactCurrency(stats.totalPaid),
                    sub: <span className="text-xs text-blue-400">{stats.totalAmount > 0 ? ((stats.totalPaid/stats.totalAmount)*100).toFixed(1) : 0}% of total</span>,
                    hoverBorder: isDark ? 'rgba(59,130,246,0.30)' : 'rgba(59,130,246,0.25)',
                  },
                  {
                    icon: <div className={`p-3 bg-gradient-to-br ${stats.totalDue > 0 ? 'from-orange-500 to-red-600' : 'from-emerald-500 to-emerald-600'} rounded-xl shadow-lg`}><AlertCircle className="h-5 w-5 text-white" /></div>,
                    trendIcon: stats.totalDue > 0 ? <div className="animate-pulse h-2.5 w-2.5 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50" /> : null,
                    label: 'Outstanding', value: <span style={{ color: stats.totalDue > 0 ? '#fb923c' : '#34d399' }}>{formatCompactCurrency(stats.totalDue)}</span>,
                    sub: <span className="text-xs" style={{ color: th.textMuted }}>{stats.overduePayments} pending payments</span>,
                    hoverBorder: isDark ? 'rgba(249,115,22,0.30)' : 'rgba(249,115,22,0.25)',
                  },
                ].map((card, i) => (
                  <div key={i} className="rounded-2xl p-5 transition-all group relative overflow-hidden border cursor-default"
                    style={{ background: th.cardBg, borderColor: th.cardBorder }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = card.hoverBorder)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = th.cardBorder)}>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: th.cardHoverOverlay }} />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">{card.icon}{card.trendIcon}</div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: th.textSecondary }}>{card.label}</h3>
                      <p className="text-3xl font-bold mb-1" style={{ color: th.textPrimary }}>{card.value}</p>
                      {card.sub}
                    </div>
                  </div>
                ))}
              </div>
              {/* Top Suppliers */}
              <div className="rounded-2xl p-5 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2" style={{ color: th.textPrimary }}>
                    <Star className="h-4 w-4 text-yellow-400" />Top Suppliers
                  </h3>
                </div>
                <div className="space-y-3">
                  {stats.topSuppliers.slice(0, 3).map((supplier, i) => (
                    <div key={supplier.name} className="flex items-center justify-between p-3 rounded-xl transition-all border"
                      style={{ background: th.statInnerBg, borderColor: th.statInnerBorder }}
                      onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = th.statInnerBg)}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-yellow-500/10 text-yellow-400' : i === 1 ? 'bg-gray-400/10 text-gray-400' : 'bg-orange-500/10 text-orange-400'}`}>
                          <span className="text-sm font-bold">#{i + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm" style={{ color: th.textPrimary }}>{supplier.name}</p>
                          <p className="text-xs" style={{ color: th.textSecondary }}>{formatCompactCurrency(supplier.total)}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4" style={{ color: th.textMuted }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Desktop Filters */}
          <div className="hidden md:block mb-6">
            <div className="rounded-2xl shadow-lg p-5 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold" style={{ color: th.textPrimary }}>Filters & Search</h3>
                  <PaymentToggle />
                  {(statusFilter !== 'all' || supplierFilter !== 'all' || paymentMethodFilter !== 'all' || dateRange.startDate) && (
                    <button onClick={clearFilters} className="text-xs text-[#E84545] hover:text-[#E84545]/80 transition-colors flex items-center gap-1">
                      <X className="h-3 w-3" />Clear all
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: th.inputBg }}>
                  {(['grid', 'list', 'compact'] as ViewMode[]).map((mode, i) => {
                    const icons = [<Grid className="h-4 w-4" />, <List className="h-4 w-4" />, <Layers className="h-4 w-4" />];
                    return (
                      <button key={mode} onClick={() => setViewMode(mode)}
                        className={`p-2 rounded-lg transition-all ${viewMode === mode ? 'bg-[#E84545] text-white' : ''}`}
                        style={viewMode !== mode ? { color: th.textSecondary } : {}}>
                        {icons[i]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-6 gap-3">
                <div className="relative col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: th.inputPH }} />
                  <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search by purchase # or supplier..."
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl ${inputClass}`} style={inputStyle} />
                </div>
                {[
                  { value: statusFilter, onChange: setStatusFilter, opts: [['all','All Status'],['COMPLETED','✓ Completed'],['DRAFT','○ Draft'],['CANCELLED','✕ Cancelled']] },
                  { value: supplierFilter, onChange: setSupplierFilter, opts: [['all','All Suppliers'], ...suppliers.map(s => [s._id, s.name])] },
                  { value: paymentMethodFilter, onChange: setPaymentMethodFilter, opts: [['all','All Payments'],['CASH','💵 Cash'],['CARD','💳 Card'],['BANK_TRANSFER','🏦 Bank Transfer'],['CREDIT','📋 Credit']] },
                ].map((s, i) => (
                  <select key={i} value={s.value} onChange={e => s.onChange(e.target.value)}
                    className={`px-4 py-2.5 rounded-xl appearance-none ${inputClass}`} style={inputStyle}>
                    {s.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                ))}
                <input type="date" value={dateRange.startDate} onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className={`px-4 py-2.5 rounded-xl ${inputClass}`} style={inputStyle} />
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs mr-2" style={{ color: th.textMuted }}>Quick:</span>
                {['all', 'today', 'week', 'month', 'quarter', 'year'].map(f => (
                  <button key={f} onClick={() => applyQuickDateFilter(f)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: quickDateFilter === f ? th.quickActiveBg : th.quickInactiveBg, color: quickDateFilter === f ? th.quickActiveText : th.quickInactiveText }}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedPurchases.size > 0 && (
            <div className="mb-4 rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-top duration-300 border"
              style={{ background: th.bulkBarBg, borderColor: th.bulkBarBorder }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#E84545]/20"><CheckCircle className="h-5 w-5 text-[#E84545]" /></div>
                <div>
                  <p className="font-semibold" style={{ color: th.textPrimary }}>{selectedPurchases.size} purchases selected</p>
                  <p className="text-xs" style={{ color: th.textSecondary }}>Choose an action to apply</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {[
                  { label:'Export', icon:<Download className="h-4 w-4" />, action: handleBulkExport, style: { background: th.inputBg, borderColor: th.inputBorder, color: th.textPrimary } },
                  { label:'Print', icon:<Printer className="h-4 w-4" />, action: () => toast.success('Printing...'), style: { background: th.inputBg, borderColor: th.inputBorder, color: th.textPrimary } },
                ].map(btn => (
                  <button key={btn.label} onClick={btn.action}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all border" style={btn.style}>
                    {btn.icon}{btn.label}
                  </button>
                ))}
                <button onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-all">
                  <Trash2 className="h-4 w-4" />Delete
                </button>
                <button onClick={() => setSelectedPurchases(new Set())}
                  className="p-2 rounded-lg transition-all border"
                  style={{ background: th.inputBg, borderColor: th.inputBorder, color: th.textSecondary }}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Empty State shared */}
          {filteredAndSortedPurchases.length === 0 ? (
            <div className="rounded-2xl shadow-lg p-12 text-center border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: th.emptyIconBg }}>
                <ShoppingCart className="h-10 w-10 md:h-12 md:w-12" style={{ color: th.emptyIcon }} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-2" style={{ color: th.textPrimary }}>No Purchases Found</h3>
              <p className="mb-6" style={{ color: th.textSecondary }}>
                {paymentStatusFilter === 'unpaid' ? 'No unpaid purchases. Switch to "All" to view all purchases.' : 'Start by creating your first purchase order'}
              </p>
              <button onClick={() => router.push('/autocityPro/purchases/new')}
                className="px-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold hover:opacity-90 transition-all inline-flex items-center gap-2 shadow-lg">
                <Plus className="h-5 w-5" />Create Purchase Order
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              {isMobile && (
                <div className="space-y-4">
                  {filteredAndSortedPurchases.map(purchase => (
                    <div key={purchase._id} onClick={() => router.push(`/autocityPro/purchases/${purchase._id}`)}
                      className="rounded-2xl shadow-lg p-4 active:scale-[0.98] transition-all relative overflow-hidden group border cursor-pointer"
                      style={{ background: th.cardBg, borderColor: th.cardBorder }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = th.cardBorderHover)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = th.cardBorder)}>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: th.cardHoverOverlay }} />
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1.5 bg-gradient-to-br from-[#E84545] to-[#cc3c3c] rounded-lg">
                                <FileText className="h-3.5 w-3.5 text-white" />
                              </div>
                              <h3 className="font-bold text-sm" style={{ color: th.textPrimary }}>{purchase.purchaseNumber}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-3 w-3" style={{ color: th.textSecondary }} />
                              <p className="text-xs truncate" style={{ color: th.textSecondary }}>{purchase.supplierName}</p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border flex items-center gap-1 ${getStatusColor(purchase.status)}`}>
                            {getStatusIcon(purchase.status)}{purchase.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3 p-3 rounded-xl border" style={{ background: th.statInnerBg, borderColor: th.statInnerBorder }}>
                          <div>
                            <div className="flex items-center gap-1 mb-1"><DollarSign className="h-3 w-3" style={{ color: th.textMuted }} /><p className="text-[10px] font-medium" style={{ color: th.textMuted }}>Total Amount</p></div>
                            <p className="font-bold text-sm" style={{ color: th.textPrimary }}>{formatCompactCurrency(purchase.grandTotal)}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 mb-1"><AlertCircle className="h-3 w-3" style={{ color: th.textMuted }} /><p className="text-[10px] font-medium" style={{ color: th.textMuted }}>Balance Due</p></div>
                            <p className={`font-bold text-sm ${purchase.balanceDue > 0 ? 'text-orange-400' : 'text-emerald-500'}`}>{formatCompactCurrency(purchase.balanceDue)}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: th.divider }}>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold border flex items-center gap-1 ${getPaymentMethodColor(purchase.paymentMethod)}`}>
                              {getPaymentMethodIcon(purchase.paymentMethod)}{purchase.paymentMethod?.replace('_', ' ')}
                            </span>
                            <div className="flex items-center gap-1" style={{ color: th.textMuted }}>
                              <Package className="h-3 w-3" /><span className="text-[10px]">{purchase.items?.length || 0}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1" style={{ color: th.textMuted }}>
                            <Calendar className="h-3 w-3" />
                            <p className="text-[10px]">{new Date(purchase.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Desktop Grid */}
              {!isMobile && viewMode === 'grid' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredAndSortedPurchases.map(purchase => (
                    <div key={purchase._id} onClick={() => router.push(`/autocityPro/purchases/${purchase._id}`)}
                      className="rounded-2xl shadow-lg p-5 transition-all cursor-pointer group relative overflow-hidden border"
                      style={{ background: th.cardBg, borderColor: th.cardBorder }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = th.cardBorderHover)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = th.cardBorder)}>
                      <div className="absolute top-4 left-4 z-20" onClick={e => { e.stopPropagation(); toggleSelectPurchase(purchase._id); }}>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedPurchases.has(purchase._id) ? 'bg-[#E84545] border-[#E84545]' : ''}`}
                          style={!selectedPurchases.has(purchase._id) ? { borderColor: th.dividerStrong } : {}}>
                          {selectedPurchases.has(purchase._id) && <CheckCircle className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: th.cardHoverOverlay }} />
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4 pl-8">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-2 bg-gradient-to-br from-[#E84545] to-[#cc3c3c] rounded-lg"><FileText className="h-4 w-4 text-white" /></div>
                              <h3 className="font-bold" style={{ color: th.textPrimary }}>{purchase.purchaseNumber}</h3>
                            </div>
                            <div className="flex items-center gap-2" style={{ color: th.textSecondary }}>
                              <Users className="h-3.5 w-3.5" /><p className="text-sm">{purchase.supplierName}</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${getStatusColor(purchase.status)}`}>
                            {getStatusIcon(purchase.status)}{purchase.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="p-3 rounded-xl border" style={{ background: th.statInnerBg, borderColor: th.statInnerBorder }}>
                            <div className="flex items-center gap-2 mb-1"><DollarSign className="h-3.5 w-3.5 text-emerald-400" /><p className="text-xs" style={{ color: th.textSecondary }}>Total Amount</p></div>
                            <p className="font-bold" style={{ color: th.textPrimary }}>{formatCompactCurrency(purchase.grandTotal)}</p>
                          </div>
                          <div className="p-3 rounded-xl border" style={{ background: th.statInnerBg, borderColor: th.statInnerBorder }}>
                            <div className="flex items-center gap-2 mb-1"><AlertCircle className="h-3.5 w-3.5 text-orange-400" /><p className="text-xs" style={{ color: th.textSecondary }}>Balance</p></div>
                            <p className={`font-bold ${purchase.balanceDue > 0 ? 'text-orange-400' : 'text-emerald-500'}`}>{formatCompactCurrency(purchase.balanceDue)}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: th.divider }}>
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${getPaymentMethodColor(purchase.paymentMethod)}`}>
                              {getPaymentMethodIcon(purchase.paymentMethod)}{purchase.paymentMethod?.replace('_', ' ')}
                            </span>
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border" style={{ background: th.statInnerBg, borderColor: th.statInnerBorder }}>
                              <Package className="h-3.5 w-3.5" style={{ color: th.textSecondary }} />
                              <span className="text-xs font-medium" style={{ color: th.textPrimary }}>{purchase.items?.length || 0}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5" style={{ color: th.textSecondary }}>
                            <Calendar className="h-3.5 w-3.5" />
                            <span className="text-xs">{new Date(purchase.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Desktop List */}
              {!isMobile && viewMode === 'list' && (
                <div className="rounded-2xl shadow-lg overflow-hidden border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ background: th.tableHeadBg, borderBottom: `1px solid ${th.dividerStrong}` }}>
                        <tr>
                          <th className="px-6 py-4 text-left">
                            <input type="checkbox" checked={selectedPurchases.size === filteredAndSortedPurchases.length && filteredAndSortedPurchases.length > 0}
                              onChange={selectAllPurchases} className="w-4 h-4 rounded" />
                          </th>
                          {[
                            { label:'Purchase #', field:'date' as SortField },
                            { label:'Date', field:null },
                            { label:'Supplier', field:'supplier' as SortField },
                            { label:'Items', field:null },
                            { label:'Amount', field:'amount' as SortField },
                            { label:'Paid', field:null },
                            { label:'Balance', field:'balance' as SortField },
                            { label:'Payment', field:null },
                            { label:'Status', field:'status' as SortField },
                            { label:'Actions', field:null },
                          ].map((h, i) => (
                            <th key={i} className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${h.field ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                              style={{ color: th.tableHeadText }}
                              onClick={() => h.field && toggleSort(h.field)}>
                              <div className="flex items-center gap-2">
                                {h.label}
                                {h.field && sortField === h.field && (sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedPurchases.map(purchase => (
                          <tr key={purchase._id} className="transition-all cursor-pointer group"
                            style={{ borderTop: `1px solid ${th.tableRowDivider}` }}
                            onClick={() => router.push(`/autocityPro/purchases/${purchase._id}`)}
                            onMouseEnter={e => (e.currentTarget.style.background = th.tableRowHover)}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <td className="px-6 py-4" onClick={e => { e.stopPropagation(); toggleSelectPurchase(purchase._id); }}>
                              <input type="checkbox" checked={selectedPurchases.has(purchase._id)} onChange={() => {}} className="w-4 h-4 rounded" />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E84545] to-[#cc3c3c] flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <FileText className="h-4 w-4 text-white" />
                                </div>
                                <span className="font-semibold" style={{ color: th.textPrimary }}>{purchase.purchaseNumber}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium" style={{ color: th.textPrimary }}>{new Date(purchase.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                              <p className="text-xs" style={{ color: th.textMuted }}>{new Date(purchase.purchaseDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: th.statInnerBg }}>
                                  <Users className="h-4 w-4" style={{ color: th.textSecondary }} />
                                </div>
                                <span style={{ color: th.textPrimary }}>{purchase.supplierName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg w-fit border" style={{ background: th.statInnerBg, borderColor: th.statInnerBorder }}>
                                <Package className="h-3.5 w-3.5" style={{ color: th.textSecondary }} />
                                <span className="text-sm font-medium" style={{ color: th.textPrimary }}>{purchase.items?.length || 0}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4"><span className="font-semibold" style={{ color: th.textPrimary }}>{formatCurrency(purchase.grandTotal)}</span></td>
                            <td className="px-6 py-4"><span className="font-semibold text-emerald-500">{formatCurrency(purchase.amountPaid)}</span></td>
                            <td className="px-6 py-4"><span className={`font-semibold ${purchase.balanceDue > 0 ? 'text-orange-400' : ''}`} style={purchase.balanceDue <= 0 ? { color: th.textMuted } : {}}>{formatCurrency(purchase.balanceDue)}</span></td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 w-fit ${getPaymentMethodColor(purchase.paymentMethod)}`}>
                                {getPaymentMethodIcon(purchase.paymentMethod)}{purchase.paymentMethod?.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 w-fit ${getStatusColor(purchase.status)}`}>
                                {getStatusIcon(purchase.status)}{purchase.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button onClick={e => { e.stopPropagation(); router.push(`/autocityPro/purchases/${purchase._id}`); }}
                                  className="p-2 rounded-lg transition-all border hover:border-[#E84545]/30 hover:text-[#E84545]"
                                  style={{ background: th.statInnerBg, borderColor: th.statInnerBorder, color: th.textSecondary }}>
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button onClick={e => { e.stopPropagation(); toast.success('Downloading purchase...'); }}
                                  className="p-2 rounded-lg transition-all border hover:border-blue-500/30 hover:text-blue-400"
                                  style={{ background: th.statInnerBg, borderColor: th.statInnerBorder, color: th.textSecondary }}>
                                  <Download className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Desktop Compact */}
              {!isMobile && viewMode === 'compact' && (
                <div className="rounded-2xl shadow-lg overflow-hidden border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                  <div>
                    {filteredAndSortedPurchases.map(purchase => (
                      <div key={purchase._id} onClick={() => router.push(`/autocityPro/purchases/${purchase._id}`)}
                        className="flex items-center justify-between p-4 transition-all cursor-pointer group border-b"
                        style={{ borderColor: th.tableRowDivider }}
                        onMouseEnter={e => (e.currentTarget.style.background = th.tableRowHover)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div className="flex items-center gap-4 flex-1">
                          <div onClick={e => { e.stopPropagation(); toggleSelectPurchase(purchase._id); }}>
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedPurchases.has(purchase._id) ? 'bg-[#E84545] border-[#E84545]' : ''}`}
                              style={!selectedPurchases.has(purchase._id) ? { borderColor: th.dividerStrong } : {}}>
                              {selectedPurchases.has(purchase._id) && <CheckCircle className="h-3 w-3 text-white" />}
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E84545] to-[#cc3c3c] flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FileText className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold" style={{ color: th.textPrimary }}>{purchase.purchaseNumber}</h3>
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1 ${getStatusColor(purchase.status)}`}>
                                {getStatusIcon(purchase.status)}{purchase.status}
                              </span>
                            </div>
                            <p className="text-sm mt-1" style={{ color: th.textSecondary }}>{purchase.supplierName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-right">
                            <p className="text-xs mb-1" style={{ color: th.textSecondary }}>Total</p>
                            <p className="font-bold" style={{ color: th.textPrimary }}>{formatCompactCurrency(purchase.grandTotal)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs mb-1" style={{ color: th.textSecondary }}>Balance</p>
                            <p className={`font-bold ${purchase.balanceDue > 0 ? 'text-orange-400' : 'text-emerald-500'}`}>{formatCompactCurrency(purchase.balanceDue)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs mb-1" style={{ color: th.textSecondary }}>Date</p>
                            <p className="text-sm" style={{ color: th.textPrimary }}>{new Date(purchase.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 transition-colors group-hover:text-white" style={{ color: th.textMuted }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Summary Footer */}
          {filteredAndSortedPurchases.length > 0 && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
              {[
                { icon: <ShoppingCart className="h-4 w-4" style={{ color: th.textSecondary }} />, label:'Total Orders', value: stats.total, valueStyle: { color: th.textPrimary }, hoverBorder: th.dividerStrong },
                { icon: <DollarSign className="h-4 w-4 text-emerald-400" />, label:'Total Value', value: formatCompactCurrency(stats.totalAmount), valueStyle: { color: th.textPrimary }, hoverBorder: isDark ? 'rgba(16,185,129,0.30)' : 'rgba(16,185,129,0.25)' },
                { icon: <CheckCircle className="h-4 w-4 text-blue-400" />, label:'Total Paid', value: formatCompactCurrency(stats.totalPaid), valueStyle: { color: '#34d399' }, hoverBorder: isDark ? 'rgba(59,130,246,0.30)' : 'rgba(59,130,246,0.25)' },
                { icon: <AlertCircle className="h-4 w-4 text-orange-400" />, label:'Outstanding', value: formatCompactCurrency(stats.totalDue), valueStyle: { color: stats.totalDue > 0 ? '#fb923c' : '#34d399' }, hoverBorder: isDark ? 'rgba(249,115,22,0.30)' : 'rgba(249,115,22,0.25)' },
                { icon: <Activity className="h-4 w-4 text-purple-400" />, label:'Avg. Order', value: formatCompactCurrency(stats.averageOrderValue), valueStyle: { color: th.textPrimary }, hoverBorder: isDark ? 'rgba(168,85,247,0.30)' : 'rgba(168,85,247,0.25)' },
              ].map(card => (
                <div key={card.label} className="rounded-xl p-4 transition-all border cursor-default"
                  style={{ background: th.cardBg, borderColor: th.summaryCardBorder }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = card.hoverBorder)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = th.summaryCardBorder)}>
                  <div className="flex items-center gap-2 mb-2">{card.icon}<p className="text-xs font-medium" style={{ color: th.textSecondary }}>{card.label}</p></div>
                  <p className="font-bold text-lg" style={card.valueStyle}>{card.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Filter Modal */}
        {showFilters && (
          <div className="md:hidden fixed inset-0 backdrop-blur-md z-[60] animate-in fade-in duration-200" style={{ background: th.modalOverlay }}>
            <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl max-h-[90vh] overflow-y-auto"
              style={{ background: th.modalBg, borderColor: th.modalBorder }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: th.modalTitle }}>
                  <Filter className="h-5 w-5 text-[#E84545]" />Filters
                </h2>
                <button onClick={() => setShowFilters(false)} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.modalCloseBg, color: th.modalCloseText }}><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-4">
                {[
                  { label:'Payment Status', value: paymentStatusFilter, onChange: setPaymentStatusFilter, opts:[['unpaid','Unpaid Only'],['paid','Paid Only'],['all','All Purchases']] },
                  { label:'Status', value: statusFilter, onChange: setStatusFilter, opts:[['all','All Status'],['COMPLETED','✓ Completed'],['DRAFT','○ Draft'],['CANCELLED','✕ Cancelled']] },
                  { label:'Supplier', value: supplierFilter, onChange: setSupplierFilter, opts:[['all','All Suppliers'], ...suppliers.map(s => [s._id, s.name])] },
                  { label:'Payment Method', value: paymentMethodFilter, onChange: setPaymentMethodFilter, opts:[['all','All Payment Methods'],['CASH','💵 Cash'],['CARD','💳 Card'],['BANK_TRANSFER','🏦 Bank Transfer'],['CREDIT','📋 Credit']] },
                ].map(s => (
                  <div key={s.label}>
                    <label className="block text-sm font-medium mb-2" style={{ color: th.textSecondary }}>{s.label}</label>
                    <select value={s.value} onChange={e => s.onChange(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                      style={inputStyle}>
                      {s.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                ))}
                {[
                  { label:'Start Date', value: dateRange.startDate, onChange: (v: string) => setDateRange({ ...dateRange, startDate: v }) },
                  { label:'End Date',   value: dateRange.endDate,   onChange: (v: string) => setDateRange({ ...dateRange, endDate: v }) },
                ].map(d => (
                  <div key={d.label}>
                    <label className="block text-sm font-medium mb-2" style={{ color: th.textSecondary }}>{d.label}</label>
                    <input type="date" value={d.value} onChange={e => d.onChange(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E84545]/50"
                      style={inputStyle} />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button onClick={clearFilters} className="px-4 py-3 rounded-xl font-medium active:scale-95 transition-all border"
                    style={{ background: th.modalCloseBg, borderColor: th.modalBorder, color: th.textSecondary }}>Clear All</button>
                  <button onClick={() => setShowFilters(false)}
                    className="px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg active:scale-95">
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200" style={{ background: th.modalOverlay }}>
            <div className="rounded-2xl p-6 max-w-md w-full animate-in zoom-in duration-300 border shadow-2xl"
              style={{ background: th.modalBg, borderColor: th.modalBorder }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: th.modalTitle }}>
                  <Download className="h-5 w-5 text-[#E84545]" />Export Purchases
                </h2>
                <button onClick={() => setShowExportModal(false)} className="p-2 rounded-xl transition-all"
                  style={{ background: th.modalCloseBg, color: th.modalCloseText }}><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-3 mb-6">
                {[
                  { label:'Excel Spreadsheet', sub:'.xlsx format', color:'emerald', action:() => { toast.success('Exporting to Excel...'); setShowExportModal(false); } },
                  { label:'PDF Document', sub:'.pdf format', color:'red', action:() => { toast.success('Exporting to PDF...'); setShowExportModal(false); } },
                  { label:'CSV File', sub:'.csv format', color:'blue', action:() => { toast.success('Exporting to CSV...'); setShowExportModal(false); } },
                ].map(exp => (
                  <button key={exp.label} onClick={exp.action}
                    className="w-full p-4 rounded-xl font-medium transition-all flex items-center justify-between group border"
                    style={{ background: th.exportItemBg, borderColor: th.exportItemBorder, color: th.textPrimary }}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-${exp.color}-500/10 rounded-lg group-hover:bg-${exp.color}-500/20 transition-colors`}>
                        <FileText className={`h-5 w-5 text-${exp.color}-400`} />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">{exp.label}</p>
                        <p className="text-xs" style={{ color: th.textSecondary }}>{exp.sub}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 transition-colors group-hover:text-[#E84545]" style={{ color: th.textMuted }} />
                  </button>
                ))}
              </div>
              <div className="rounded-xl p-4 border" style={{ background: isDark ? 'rgba(59,130,246,0.10)' : 'rgba(59,130,246,0.07)', borderColor: isDark ? 'rgba(59,130,246,0.20)' : 'rgba(59,130,246,0.20)' }}>
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg mt-0.5" style={{ background: isDark ? 'rgba(59,130,246,0.20)' : 'rgba(59,130,246,0.12)' }}>
                    <Activity className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-blue-400 font-medium text-sm mb-1">Export Summary</p>
                    <p className="text-xs" style={{ color: th.textSecondary }}>
                      {filteredAndSortedPurchases.length} purchases • {formatCompactCurrency(stats.totalAmount)} total value
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="md:hidden h-24" />

      <style jsx global>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </MainLayout>
  );
}