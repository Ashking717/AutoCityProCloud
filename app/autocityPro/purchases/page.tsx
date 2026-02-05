// app/autocityPro/purchases/page.tsx
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
  MoreVertical,
  Clock,
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Sparkles,
  Users,
  Zap,
  ChevronRight,
  BarChart3,
  PieChart,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Printer,
  Send,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Settings,
  ChevronDown,
  CircleDot,
  Layers,
  Wallet,
  Receipt,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [user, setUser] = useState<User | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedPurchases, setSelectedPurchases] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [quickDateFilter, setQuickDateFilter] = useState('all');
  const [showExportModal, setShowExportModal] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
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
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("Failed to fetch user");
    }
  };

  const fetchPurchases = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (supplierFilter !== "all") params.append("supplierId", supplierFilter);
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);

      const res = await fetch(`/api/purchases?${params.toString()}`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setPurchases(data.purchases || []);
        toast.success('Purchases loaded');
      } else {
        toast.error("Failed to fetch purchases");
      }
    } catch (error) {
      console.error("Failed to fetch purchases");
      toast.error("Failed to fetch purchases");
    } finally {
      if (showLoading) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.suppliers || []);
      }
    } catch (error) {
      console.error("Failed to fetch suppliers");
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [statusFilter, supplierFilter, dateRange]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/autocityPro/login";
  };

  const handleRefresh = () => fetchPurchases(false);

  // Quick date filters
  const applyQuickDateFilter = (filter: string) => {
    setQuickDateFilter(filter);
    const today = new Date();
    let startDate = new Date();
    
    switch (filter) {
      case 'today':
        startDate = new Date(today);
        break;
      case 'week':
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(today.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        setDateRange({ startDate: '', endDate: '' });
        return;
    }
    
    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    });
  };

  // Filtered and sorted purchases
  const filteredAndSortedPurchases = useMemo(() => {
    let filtered = purchases.filter((purchase) => {
      const matchesSearch =
        purchase.purchaseNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.supplierName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPaymentMethod = 
        paymentMethodFilter === 'all' || purchase.paymentMethod === paymentMethodFilter;
      
      return matchesSearch && matchesPaymentMethod;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'date':
          comparison = new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
          break;
        case 'amount':
          comparison = a.grandTotal - b.grandTotal;
          break;
        case 'supplier':
          comparison = a.supplierName.localeCompare(b.supplierName);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'balance':
          comparison = a.balanceDue - b.balanceDue;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [purchases, searchTerm, paymentMethodFilter, sortField, sortOrder]);

  // Calculate comprehensive statistics
  const stats = useMemo(() => {
    const completed = filteredAndSortedPurchases.filter(p => p.status === 'COMPLETED');
    const draft = filteredAndSortedPurchases.filter(p => p.status === 'DRAFT');
    const cancelled = filteredAndSortedPurchases.filter(p => p.status === 'CANCELLED');
    const overduePayments = filteredAndSortedPurchases.filter(p => p.balanceDue > 0);
    
    // Calculate trends (comparing to previous period)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentPurchases = filteredAndSortedPurchases.filter(
      p => new Date(p.purchaseDate) >= thirtyDaysAgo
    );
    
    // Payment method breakdown
    const paymentMethods = filteredAndSortedPurchases.reduce((acc, p) => {
      acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top suppliers
    const supplierTotals = filteredAndSortedPurchases.reduce((acc, p) => {
      acc[p.supplierName] = (acc[p.supplierName] || 0) + p.grandTotal;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: filteredAndSortedPurchases.length,
      totalAmount: filteredAndSortedPurchases.reduce((sum, p) => sum + (p.grandTotal || 0), 0),
      totalPaid: filteredAndSortedPurchases.reduce((sum, p) => sum + (p.amountPaid || 0), 0),
      totalDue: filteredAndSortedPurchases.reduce((sum, p) => sum + (p.balanceDue || 0), 0),
      completed: completed.length,
      draft: draft.length,
      cancelled: cancelled.length,
      overduePayments: overduePayments.length,
      overdueAmount: overduePayments.reduce((sum, p) => sum + p.balanceDue, 0),
      averageOrderValue: filteredAndSortedPurchases.length > 0 
        ? filteredAndSortedPurchases.reduce((sum, p) => sum + p.grandTotal, 0) / filteredAndSortedPurchases.length 
        : 0,
      recentPurchasesCount: recentPurchases.length,
      recentAmount: recentPurchases.reduce((sum, p) => sum + p.grandTotal, 0),
      paymentMethods,
      topSuppliers: Object.entries(supplierTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, total]) => ({ name, total })),
      totalItems: filteredAndSortedPurchases.reduce((sum, p) => sum + (p.items?.length || 0), 0),
    };
  }, [filteredAndSortedPurchases]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-QA', {
      style: 'currency',
      currency: 'QAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `QR${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 10000) {
      return `QR${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "DRAFT":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "CANCELLED":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
        return <CheckCircle className="h-3.5 w-3.5" />;
      case "DRAFT":
        return <Clock className="h-3.5 w-3.5" />;
      case "CANCELLED":
        return <XCircle className="h-3.5 w-3.5" />;
      default:
        return <AlertCircle className="h-3.5 w-3.5" />;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      CASH: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      CARD: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      BANK_TRANSFER: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      CREDIT: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    };
    return colors[method] || "bg-gray-500/10 text-gray-400 border-gray-500/20";
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'CASH':
        return <Wallet className="h-3 w-3" />;
      case 'CARD':
        return <CreditCard className="h-3 w-3" />;
      case 'BANK_TRANSFER':
        return <Building2 className="h-3 w-3" />;
      case 'CREDIT':
        return <Receipt className="h-3 w-3" />;
      default:
        return <DollarSign className="h-3 w-3" />;
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSupplierFilter("all");
    setPaymentMethodFilter("all");
    setDateRange({ startDate: "", endDate: "" });
    setQuickDateFilter("all");
    setShowFilters(false);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleSelectPurchase = (id: string) => {
    const newSelected = new Set(selectedPurchases);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPurchases(newSelected);
  };

  const selectAllPurchases = () => {
    if (selectedPurchases.size === filteredAndSortedPurchases.length) {
      setSelectedPurchases(new Set());
    } else {
      setSelectedPurchases(new Set(filteredAndSortedPurchases.map(p => p._id)));
    }
  };

  const handleBulkExport = () => {
    toast.success(`Exporting ${selectedPurchases.size} purchases...`);
    setSelectedPurchases(new Set());
    setShowBulkActions(false);
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedPurchases.size} purchases?`)) {
      toast.success(`Deleted ${selectedPurchases.size} purchases`);
      setSelectedPurchases(new Set());
      setShowBulkActions(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#050505] via-[#0A0A0A] to-[#050505]">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-white/5 border-t-[#E84545] mx-auto"></div>
            <ShoppingCart className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-[#E84545]" />
          </div>
          <p className="mt-6 text-white text-lg font-semibold">Loading Purchases</p>
          <p className="text-gray-400 text-sm mt-2">Preparing your purchase data...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-gradient-to-br from-[#050505] via-[#0A0A0A] to-[#050505]">
        {/* Enhanced Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black via-[#0A0A0A] to-transparent border-b border-white/5 backdrop-blur-xl">
          <div className="px-4 py-3 pt-safe">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="p-2.5 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all border border-white/10"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-[#E84545]" />
                    Purchases
                  </h1>
                  <p className="text-xs text-white/60">{stats.total} total • {formatCompactCurrency(stats.totalAmount)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className={`p-2.5 rounded-xl ${showAnalytics ? 'bg-[#E84545]/10 text-[#E84545] border-[#E84545]/20' : 'bg-white/5 text-white/80 border-white/10'} hover:bg-white/10 active:scale-95 transition-all border`}
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => router.push('/autocityPro/purchases/new')}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white hover:opacity-90 active:scale-95 transition-all shadow-lg border border-[#E84545]/20"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Analytics Mini Cards - Mobile */}
            {showAnalytics && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-2.5 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] text-gray-400 font-medium">Completed</span>
                  </div>
                  <p className="text-base font-bold text-white">{stats.completed}</p>
                </div>
                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-2.5 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertCircle className="h-3 w-3 text-orange-400" />
                    <span className="text-[10px] text-gray-400 font-medium">Balance</span>
                  </div>
                  <p className="text-base font-bold text-orange-400">{formatCompactCurrency(stats.totalDue)}</p>
                </div>
                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-2.5 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Package className="h-3 w-3 text-blue-400" />
                    <span className="text-[10px] text-gray-400 font-medium">Items</span>
                  </div>
                  <p className="text-base font-bold text-white">{stats.totalItems}</p>
                </div>
              </div>
            )}

            {/* Search and Filters */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search purchases..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 focus:border-[#E84545]/50 text-sm backdrop-blur-sm"
                />
              </div>
              <button
                onClick={() => setShowFilters(true)}
                className="p-2.5 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all border border-white/10 relative backdrop-blur-sm"
              >
                <Filter className="h-4 w-4" />
                {(statusFilter !== 'all' || supplierFilter !== 'all' || paymentMethodFilter !== 'all' || dateRange.startDate) && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-[#E84545] rounded-full border-2 border-black"></span>
                )}
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2.5 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-50 active:scale-95 transition-all border border-white/10 backdrop-blur-sm"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Quick Date Filters */}
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
              {['all', 'today', 'week', 'month', 'quarter', 'year'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => applyQuickDateFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    quickDateFilter === filter
                      ? 'bg-[#E84545] text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Desktop Header */}
        <div className="hidden md:block py-11 bg-gradient-to-br from-[#1a0a0a] via-[#411010] to-[#0A0A0A] border-b border-white/10 shadow-2xl relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '40px 40px'
            }}></div>
          </div>
          
          <div className="max-w-[1400px] mx-auto px-6 relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-gradient-to-br from-[#E84545] to-[#cc3c3c] rounded-2xl shadow-xl">
                    <ShoppingCart className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                      Purchase Management
                    </h1>
                    <p className="text-white/70 mt-1">Track and manage all your purchase orders</p>
                  </div>
                </div>
                
                {/* Quick Stats Row */}
                {/* <div className="flex items-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white/5 rounded-lg">
                      <FileText className="h-4 w-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.total}</p>
                      <p className="text-xs text-gray-400">Total Orders</p>
                    </div>
                  </div>
                  <div className="h-10 w-px bg-white/10"></div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{formatCompactCurrency(stats.totalAmount)}</p>
                      <p className="text-xs text-gray-400">Total Value</p>
                    </div>
                  </div>
                  <div className="h-10 w-px bg-white/10"></div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-400">{formatCompactCurrency(stats.totalDue)}</p>
                      <p className="text-xs text-gray-400">Outstanding</p>
                    </div>
                  </div>
                </div> */}
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-[#E84545]/30 transition-all disabled:opacity-50 backdrop-blur-sm"
                >
                  <RefreshCw className={`h-5 w-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 hover:border-[#E84545]/30 transition-all backdrop-blur-sm"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
                <button
                  onClick={() => router.push('/autocityPro/purchases/new')}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-xl"
                >
                  <Plus className="h-5 w-5" />
                  New Purchase Order
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-[260px] md:pt-6 pb-6">
          {/* Analytics Dashboard - Desktop */}
          {!isMobile && showAnalytics && (
            <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Main Stats Grid */}
              <div className="lg:col-span-2 grid grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-5 hover:border-[#E84545]/30 transition-all group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#E84545]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-gradient-to-br from-[#E84545] to-[#cc3c3c] rounded-xl shadow-lg">
                        <ShoppingCart className="h-5 w-5 text-white" />
                      </div>
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                    </div>
                    <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                      Total Orders
                    </h3>
                    <p className="text-3xl font-bold text-white mb-1">{stats.total}</p>
                    <p className="text-xs text-emerald-400">↑ {stats.recentPurchasesCount} this month</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-5 hover:border-emerald-500/30 transition-all group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                        <DollarSign className="h-5 w-5 text-white" />
                      </div>
                      <Activity className="h-4 w-4 text-emerald-400" />
                    </div>
                    <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                      Total Value
                    </h3>
                    <p className="text-2xl font-bold text-white mb-1">{formatCompactCurrency(stats.totalAmount)}</p>
                    <p className="text-xs text-gray-400">Avg: {formatCompactCurrency(stats.averageOrderValue)}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-5 hover:border-blue-500/30 transition-all group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                      <CheckCircle className="h-4 w-4 text-blue-400" />
                    </div>
                    <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                      Completed
                    </h3>
                    <p className="text-3xl font-bold text-white mb-1">{stats.completed}</p>
                    <p className="text-xs text-blue-400">{((stats.completed / stats.total) * 100).toFixed(1)}% of total</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-5 hover:border-orange-500/30 transition-all group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 bg-gradient-to-br ${stats.totalDue > 0 ? 'from-orange-500 to-red-600' : 'from-emerald-500 to-emerald-600'} rounded-xl shadow-lg`}>
                        <AlertCircle className="h-5 w-5 text-white" />
                      </div>
                      {stats.totalDue > 0 && (
                        <div className="animate-pulse h-2.5 w-2.5 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50"></div>
                      )}
                    </div>
                    <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                      Outstanding
                    </h3>
                    <p className={`text-2xl font-bold mb-1 ${stats.totalDue > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                      {formatCompactCurrency(stats.totalDue)}
                    </p>
                    <p className="text-xs text-gray-400">{stats.overduePayments} pending payments</p>
                  </div>
                </div>
              </div>

              {/* Top Suppliers Card */}
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-400" />
                    Top Suppliers
                  </h3>
                  <button className="text-xs text-gray-400 hover:text-white transition-colors">
                    View All
                  </button>
                </div>
                <div className="space-y-3">
                  {stats.topSuppliers.slice(0, 3).map((supplier, index) => (
                    <div key={supplier.name} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          index === 0 ? 'bg-yellow-500/10 text-yellow-400' :
                          index === 1 ? 'bg-gray-400/10 text-gray-400' :
                          'bg-orange-500/10 text-orange-400'
                        }`}>
                          <span className="text-sm font-bold">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{supplier.name}</p>
                          <p className="text-gray-400 text-xs">{formatCompactCurrency(supplier.total)}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Filters and View Controls */}
          <div className="hidden md:block mb-6">
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-white font-semibold">Filters & Search</h3>
                  {(statusFilter !== 'all' || supplierFilter !== 'all' || paymentMethodFilter !== 'all' || dateRange.startDate) && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-[#E84545] hover:text-[#E84545]/80 transition-colors flex items-center gap-1"
                    >
                      <X className="h-3 w-3" />
                      Clear all
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#E84545] text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      <Grid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#E84545] text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('compact')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'compact' ? 'bg-[#E84545] text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      <Layers className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-3">
                <div className="relative col-span-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by purchase # or supplier..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 focus:border-[#E84545]/50 text-sm"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 focus:border-[#E84545]/50 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="COMPLETED">✓ Completed</option>
                  <option value="DRAFT">○ Draft</option>
                  <option value="CANCELLED">✕ Cancelled</option>
                </select>

                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 focus:border-[#E84545]/50 text-sm"
                >
                  <option value="all">All Suppliers</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier._id} value={supplier._id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>

                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 focus:border-[#E84545]/50 text-sm"
                >
                  <option value="all">All Payments</option>
                  <option value="CASH">💵 Cash</option>
                  <option value="CARD">💳 Card</option>
                  <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                  <option value="CREDIT">📋 Credit</option>
                </select>

                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 focus:border-[#E84545]/50 text-sm"
                />
              </div>

              {/* Quick Date Filters */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-gray-400 mr-2">Quick:</span>
                {['all', 'today', 'week', 'month', 'quarter', 'year'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => applyQuickDateFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      quickDateFilter === filter
                        ? 'bg-[#E84545] text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedPurchases.size > 0 && (
            <div className="mb-4 bg-gradient-to-r from-[#E84545]/10 to-purple-500/10 border border-[#E84545]/20 rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#E84545]/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-[#E84545]" />
                </div>
                <div>
                  <p className="text-white font-semibold">{selectedPurchases.size} purchases selected</p>
                  <p className="text-xs text-gray-400">Choose an action to apply</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkExport}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-all"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
                <button
                  onClick={() => {
                    toast.success('Printing selected purchases...');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-all"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
                <button
                  onClick={() => setSelectedPurchases(new Set())}
                  className="p-2 bg-white/5 border border-white/10 text-gray-400 rounded-lg hover:bg-white/10 transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Purchases Display */}
          {isMobile ? (
            // Mobile Card View
            <div className="space-y-4">
              {filteredAndSortedPurchases.length === 0 ? (
                <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-12 text-center">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart className="h-10 w-10 text-gray-600" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No Purchases Found</h3>
                  <p className="text-gray-400 mb-6">Start by creating your first purchase order</p>
                  <button
                    onClick={() => router.push('/autocityPro/purchases/new')}
                    className="px-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold hover:opacity-90 transition-all inline-flex items-center gap-2 shadow-lg"
                  >
                    <Plus className="h-5 w-5" />
                    Create Purchase Order
                  </button>
                </div>
              ) : (
                filteredAndSortedPurchases.map((purchase) => (
                  <div
                    key={purchase._id}
                    onClick={() => router.push(`/autocityPro/purchases/${purchase._id}`)}
                    className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-4 hover:border-[#E84545]/30 active:scale-[0.98] transition-all relative overflow-hidden group"
                  >
                    {/* Hover Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#E84545]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="relative z-10">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-gradient-to-br from-[#E84545] to-[#cc3c3c] rounded-lg">
                              <FileText className="h-3.5 w-3.5 text-white" />
                            </div>
                            <h3 className="text-white font-bold text-sm">{purchase.purchaseNumber}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 text-gray-400" />
                            <p className="text-gray-400 text-xs truncate">{purchase.supplierName}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border flex items-center gap-1 ${getStatusColor(purchase.status)}`}>
                          {getStatusIcon(purchase.status)}
                          {purchase.status}
                        </span>
                      </div>

                      {/* Amount Grid */}
                      <div className="grid grid-cols-2 gap-2 mb-3 p-3 bg-white/5 rounded-xl border border-white/5">
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <DollarSign className="h-3 w-3 text-gray-500" />
                            <p className="text-gray-500 text-[10px] font-medium">Total Amount</p>
                          </div>
                          <p className="text-white font-bold text-sm">{formatCompactCurrency(purchase.grandTotal)}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <AlertCircle className="h-3 w-3 text-gray-500" />
                            <p className="text-gray-500 text-[10px] font-medium">Balance Due</p>
                          </div>
                          <p className={`font-bold text-sm ${purchase.balanceDue > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                            {formatCompactCurrency(purchase.balanceDue)}
                          </p>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold border flex items-center gap-1 ${getPaymentMethodColor(purchase.paymentMethod)}`}>
                            {getPaymentMethodIcon(purchase.paymentMethod)}
                            {purchase.paymentMethod?.replace('_', ' ')}
                          </span>
                          <div className="flex items-center gap-1 text-gray-500">
                            <Package className="h-3 w-3" />
                            <span className="text-[10px]">{purchase.items?.length || 0}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <p className="text-[10px]">
                            {new Date(purchase.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Desktop Views
            <>
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredAndSortedPurchases.length === 0 ? (
                    <div className="col-span-full bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-12 text-center">
                      <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <ShoppingCart className="h-12 w-12 text-gray-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">No Purchases Found</h3>
                      <p className="text-gray-400 mb-6">Start by creating your first purchase order</p>
                      <button
                        onClick={() => router.push('/autocityPro/purchases/new')}
                        className="px-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold hover:opacity-90 transition-all inline-flex items-center gap-2 shadow-lg"
                      >
                        <Plus className="h-5 w-5" />
                        Create Purchase Order
                      </button>
                    </div>
                  ) : (
                    filteredAndSortedPurchases.map((purchase) => (
                      <div
                        key={purchase._id}
                        onClick={() => router.push(`/autocityPro/purchases/${purchase._id}`)}
                        className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-5 hover:border-[#E84545]/30 transition-all cursor-pointer group relative overflow-hidden"
                      >
                        {/* Selection Checkbox */}
                        <div
                          className="absolute top-4 left-4 z-20"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectPurchase(purchase._id);
                          }}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            selectedPurchases.has(purchase._id)
                              ? 'bg-[#E84545] border-[#E84545]'
                              : 'border-white/20 hover:border-white/40'
                          }`}>
                            {selectedPurchases.has(purchase._id) && (
                              <CheckCircle className="h-3 w-3 text-white" />
                            )}
                          </div>
                        </div>

                        <div className="absolute inset-0 bg-gradient-to-br from-[#E84545]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="relative z-10">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4 pl-8">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 bg-gradient-to-br from-[#E84545] to-[#cc3c3c] rounded-lg">
                                  <FileText className="h-4 w-4 text-white" />
                                </div>
                                <h3 className="text-white font-bold">{purchase.purchaseNumber}</h3>
                              </div>
                              <div className="flex items-center gap-2 text-gray-400">
                                <Users className="h-3.5 w-3.5" />
                                <p className="text-sm">{purchase.supplierName}</p>
                              </div>
                            </div>
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${getStatusColor(purchase.status)}`}>
                              {getStatusIcon(purchase.status)}
                              {purchase.status}
                            </span>
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                              <div className="flex items-center gap-2 mb-1">
                                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                                <p className="text-gray-400 text-xs">Total Amount</p>
                              </div>
                              <p className="text-white font-bold">{formatCompactCurrency(purchase.grandTotal)}</p>
                            </div>
                            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertCircle className="h-3.5 w-3.5 text-orange-400" />
                                <p className="text-gray-400 text-xs">Balance</p>
                              </div>
                              <p className={`font-bold ${purchase.balanceDue > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                                {formatCompactCurrency(purchase.balanceDue)}
                              </p>
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${getPaymentMethodColor(purchase.paymentMethod)}`}>
                                {getPaymentMethodIcon(purchase.paymentMethod)}
                                {purchase.paymentMethod?.replace('_', ' ')}
                              </span>
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 rounded-lg">
                                <Package className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-white text-xs font-medium">{purchase.items?.length || 0}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-400">
                              <Calendar className="h-3.5 w-3.5" />
                              <span className="text-xs">
                                {new Date(purchase.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {viewMode === 'list' && (
                <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                          <th className="px-6 py-4 text-left">
                            <input
                              type="checkbox"
                              checked={selectedPurchases.size === filteredAndSortedPurchases.length && filteredAndSortedPurchases.length > 0}
                              onChange={selectAllPurchases}
                              className="w-4 h-4 rounded border-white/20 bg-white/5"
                            />
                          </th>
                          <th 
                            className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                            onClick={() => toggleSort('date')}
                          >
                            <div className="flex items-center gap-2">
                              Purchase #
                              {sortField === 'date' && (
                                sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                              )}
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                          <th 
                            className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                            onClick={() => toggleSort('supplier')}
                          >
                            <div className="flex items-center gap-2">
                              Supplier
                              {sortField === 'supplier' && (
                                sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                              )}
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Items</th>
                          <th 
                            className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                            onClick={() => toggleSort('amount')}
                          >
                            <div className="flex items-center gap-2">
                              Amount
                              {sortField === 'amount' && (
                                sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                              )}
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Paid</th>
                          <th 
                            className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                            onClick={() => toggleSort('balance')}
                          >
                            <div className="flex items-center gap-2">
                              Balance
                              {sortField === 'balance' && (
                                sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                              )}
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Payment</th>
                          <th 
                            className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                            onClick={() => toggleSort('status')}
                          >
                            <div className="flex items-center gap-2">
                              Status
                              {sortField === 'status' && (
                                sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                              )}
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredAndSortedPurchases.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="px-6 py-16 text-center">
                              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                                <ShoppingCart className="h-10 w-10 text-gray-600" />
                              </div>
                              <h3 className="text-xl font-bold text-white mb-2">No Purchases Found</h3>
                              <p className="text-gray-400 mb-6">Try adjusting your filters or create a new purchase order</p>
                              <button
                                onClick={() => router.push('/autocityPro/purchases/new')}
                                className="px-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold hover:opacity-90 transition-all inline-flex items-center gap-2 shadow-lg"
                              >
                                <Plus className="h-5 w-5" />
                                Create Purchase Order
                              </button>
                            </td>
                          </tr>
                        ) : (
                          filteredAndSortedPurchases.map((purchase) => (
                            <tr
                              key={purchase._id}
                              className="hover:bg-white/5 transition-all cursor-pointer group"
                              onClick={() => router.push(`/autocityPro/purchases/${purchase._id}`)}
                            >
                              <td className="px-6 py-4">
                                <div onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelectPurchase(purchase._id);
                                }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedPurchases.has(purchase._id)}
                                    onChange={() => {}}
                                    className="w-4 h-4 rounded border-white/20 bg-white/5"
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E84545] to-[#cc3c3c] flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FileText className="h-4 w-4 text-white" />
                                  </div>
                                  <span className="text-white font-semibold">{purchase.purchaseNumber}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div>
                                  <p className="text-white text-sm font-medium">{new Date(purchase.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                  <p className="text-gray-500 text-xs">{new Date(purchase.purchaseDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                    <Users className="h-4 w-4 text-gray-400" />
                                  </div>
                                  <span className="text-white">{purchase.supplierName}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg w-fit">
                                  <Package className="h-3.5 w-3.5 text-gray-400" />
                                  <span className="text-white text-sm font-medium">{purchase.items?.length || 0}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-white font-semibold">{formatCurrency(purchase.grandTotal)}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-emerald-400 font-semibold">{formatCurrency(purchase.amountPaid)}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`font-semibold ${purchase.balanceDue > 0 ? 'text-orange-400' : 'text-gray-500'}`}>
                                  {formatCurrency(purchase.balanceDue)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 w-fit ${getPaymentMethodColor(purchase.paymentMethod)}`}>
                                  {getPaymentMethodIcon(purchase.paymentMethod)}
                                  {purchase.paymentMethod?.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 w-fit ${getStatusColor(purchase.status)}`}>
                                  {getStatusIcon(purchase.status)}
                                  {purchase.status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/autocityPro/purchases/${purchase._id}`);
                                    }}
                                    className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-[#E84545]/10 hover:text-[#E84545] transition-all"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toast.success('Downloading purchase...');
                                    }}
                                    className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-blue-500/10 hover:text-blue-400 transition-all"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {viewMode === 'compact' && (
                <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg overflow-hidden">
                  <div className="divide-y divide-white/5">
                    {filteredAndSortedPurchases.length === 0 ? (
                      <div className="p-16 text-center">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                          <ShoppingCart className="h-10 w-10 text-gray-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Purchases Found</h3>
                        <p className="text-gray-400 mb-6">Try adjusting your filters or create a new purchase order</p>
                        <button
                          onClick={() => router.push('/autocityPro/purchases/new')}
                          className="px-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold hover:opacity-90 transition-all inline-flex items-center gap-2 shadow-lg"
                        >
                          <Plus className="h-5 w-5" />
                          Create Purchase Order
                        </button>
                      </div>
                    ) : (
                      filteredAndSortedPurchases.map((purchase) => (
                        <div
                          key={purchase._id}
                          onClick={() => router.push(`/autocityPro/purchases/${purchase._id}`)}
                          className="flex items-center justify-between p-4 hover:bg-white/5 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelectPurchase(purchase._id);
                              }}
                            >
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                selectedPurchases.has(purchase._id)
                                  ? 'bg-[#E84545] border-[#E84545]'
                                  : 'border-white/20 hover:border-white/40'
                              }`}>
                                {selectedPurchases.has(purchase._id) && (
                                  <CheckCircle className="h-3 w-3 text-white" />
                                )}
                              </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E84545] to-[#cc3c3c] flex items-center justify-center group-hover:scale-110 transition-transform">
                              <FileText className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="text-white font-semibold">{purchase.purchaseNumber}</h3>
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1 ${getStatusColor(purchase.status)}`}>
                                  {getStatusIcon(purchase.status)}
                                  {purchase.status}
                                </span>
                              </div>
                              <p className="text-gray-400 text-sm mt-1">{purchase.supplierName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-8">
                            <div className="text-right">
                              <p className="text-gray-400 text-xs mb-1">Total</p>
                              <p className="text-white font-bold">{formatCompactCurrency(purchase.grandTotal)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-400 text-xs mb-1">Balance</p>
                              <p className={`font-bold ${purchase.balanceDue > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                                {formatCompactCurrency(purchase.balanceDue)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-400 text-xs mb-1">Date</p>
                              <p className="text-white text-sm">
                                {new Date(purchase.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Summary Footer */}
          {filteredAndSortedPurchases.length > 0 && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="h-4 w-4 text-gray-400" />
                  <p className="text-gray-400 text-xs font-medium">Total Orders</p>
                </div>
                <p className="text-white font-bold text-lg">{stats.total}</p>
              </div>
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-xl p-4 hover:border-emerald-500/30 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  <p className="text-gray-400 text-xs font-medium">Total Value</p>
                </div>
                <p className="text-white font-bold text-lg">{formatCompactCurrency(stats.totalAmount)}</p>
              </div>
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-xl p-4 hover:border-blue-500/30 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-blue-400" />
                  <p className="text-gray-400 text-xs font-medium">Total Paid</p>
                </div>
                <p className="text-emerald-400 font-bold text-lg">{formatCompactCurrency(stats.totalPaid)}</p>
              </div>
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-xl p-4 hover:border-orange-500/30 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-orange-400" />
                  <p className="text-gray-400 text-xs font-medium">Outstanding</p>
                </div>
                <p className={`font-bold text-lg ${stats.totalDue > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {formatCompactCurrency(stats.totalDue)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-xl p-4 hover:border-purple-500/30 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-purple-400" />
                  <p className="text-gray-400 text-xs font-medium">Avg. Order</p>
                </div>
                <p className="text-white font-bold text-lg">{formatCompactCurrency(stats.averageOrderValue)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Filter Modal */}
        {showFilters && (
          <div className="md:hidden fixed inset-0 bg-black/90 backdrop-blur-md z-[60] animate-in fade-in duration-200">
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#0A0A0A] to-[#050505] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Filter className="h-5 w-5 text-[#E84545]" />
                  Filters
                </h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 focus:border-[#E84545]/50"
                  >
                    <option value="all">All Status</option>
                    <option value="COMPLETED">✓ Completed</option>
                    <option value="DRAFT">○ Draft</option>
                    <option value="CANCELLED">✕ Cancelled</option>
                  </select>
                </div>

                {/* Supplier Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Supplier</label>
                  <select
                    value={supplierFilter}
                    onChange={(e) => setSupplierFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 focus:border-[#E84545]/50"
                  >
                    <option value="all">All Suppliers</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Method Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Payment Method</label>
                  <select
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 focus:border-[#E84545]/50"
                  >
                    <option value="all">All Payment Methods</option>
                    <option value="CASH">💵 Cash</option>
                    <option value="CARD">💳 Card</option>
                    <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                    <option value="CREDIT">📋 Credit</option>
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 focus:border-[#E84545]/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">End Date</label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 focus:border-[#E84545]/50"
                  />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 hover:border-[#E84545]/30 transition-all font-medium active:scale-95"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg active:scale-95"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-6 max-w-md w-full animate-in zoom-in duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Download className="h-5 w-5 text-[#E84545]" />
                  Export Purchases
                </h2>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => {
                    toast.success('Exporting to Excel...');
                    setShowExportModal(false);
                  }}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium hover:bg-white/10 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                      <FileText className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Excel Spreadsheet</p>
                      <p className="text-xs text-gray-400">.xlsx format</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                </button>

                <button
                  onClick={() => {
                    toast.success('Exporting to PDF...');
                    setShowExportModal(false);
                  }}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium hover:bg-white/10 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg group-hover:bg-red-500/20 transition-colors">
                      <FileText className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">PDF Document</p>
                      <p className="text-xs text-gray-400">.pdf format</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                </button>

                <button
                  onClick={() => {
                    toast.success('Exporting to CSV...');
                    setShowExportModal(false);
                  }}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium hover:bg-white/10 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                      <FileText className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">CSV File</p>
                      <p className="text-xs text-gray-400">.csv format</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                </button>

                <button
                  onClick={() => {
                    toast.success('Exporting to JSON...');
                    setShowExportModal(false);
                  }}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium hover:bg-white/10 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                      <FileText className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">JSON Data</p>
                      <p className="text-xs text-gray-400">.json format</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                </button>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-blue-500/20 rounded-lg mt-0.5">
                    <Activity className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-blue-400 font-medium text-sm mb-1">Export Summary</p>
                    <p className="text-gray-400 text-xs">
                      {filteredAndSortedPurchases.length} purchases • {formatCompactCurrency(stats.totalAmount)} total value
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Safe Area Bottom Padding */}
      <div className="md:hidden h-24"></div>

      {/* Custom Styles */}
      <style jsx global>{`
        @supports (padding: max(0px)) {
          .pt-safe {
            padding-top: max(12px, env(safe-area-inset-top));
          }
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        @keyframes slideInFromTop {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes slideInFromBottom {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes zoomIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-in {
          animation-fill-mode: both;
        }
        
        .slide-in-from-top {
          animation-name: slideInFromTop;
        }
        
        .slide-in-from-bottom {
          animation-name: slideInFromBottom;
        }
        
        .fade-in {
          animation-name: fadeIn;
        }
        
        .zoom-in {
          animation-name: zoomIn;
        }
        
        .duration-200 {
          animation-duration: 200ms;
        }
        
        .duration-300 {
          animation-duration: 300ms;
        }
        
        .duration-500 {
          animation-duration: 500ms;
        }

        /* Custom select styles */
        select option {
          background-color: #0A0A0A;
          color: white;
          padding: 8px;
        }

        /* Smooth transitions */
        * {
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Enhanced scrollbar for desktop */
        @media (min-width: 768px) {
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }

          ::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
          }

          ::-webkit-scrollbar-thumb {
            background: rgba(232, 69, 69, 0.5);
            border-radius: 4px;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: rgba(232, 69, 69, 0.7);
          }
        }

        /* Improved focus states */
        input:focus,
        select:focus,
        button:focus {
          outline: none;
        }

        /* Loading states */
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        /* Improved hover effects */
        @media (hover: hover) {
          button:hover,
          a:hover {
            transform: translateY(-1px);
          }

          button:active,
          a:active {
            transform: translateY(0);
          }
        }

        /* Mobile touch feedback */
        @media (hover: none) {
          button:active,
          a:active {
            opacity: 0.7;
          }
        }

        /* Gradient text */
        .gradient-text {
          background: linear-gradient(135deg, #E84545 0%, #cc3c3c 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Glass morphism effects */
        .glass {
          background: rgba(10, 10, 10, 0.7);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        /* Shimmer loading effect */
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        .shimmer {
          animation: shimmer 2s infinite;
          background: linear-gradient(
            to right,
            rgba(255, 255, 255, 0.05) 0%,
            rgba(255, 255, 255, 0.1) 50%,
            rgba(255, 255, 255, 0.05) 100%
          );
          background-size: 1000px 100%;
        }

        /* Enhanced card hover effects */
        .card-hover {
          position: relative;
          overflow: hidden;
        }

        .card-hover::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(232, 69, 69, 0.1),
            transparent
          );
          transition: left 0.5s;
        }

        .card-hover:hover::before {
          left: 100%;
        }

        /* Number counter animation */
        @keyframes countUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .count-up {
          animation: countUp 0.5s ease-out;
        }

        /* Micro-interactions */
        .micro-bounce {
          transition: transform 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .micro-bounce:active {
          transform: scale(0.95);
        }

        /* Status badge pulse */
        @keyframes statusPulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(232, 69, 69, 0.7);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(232, 69, 69, 0);
          }
        }

        .status-pulse {
          animation: statusPulse 2s infinite;
        }

        /* Skeleton loading */
        .skeleton {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.05) 25%,
            rgba(255, 255, 255, 0.1) 50%,
            rgba(255, 255, 255, 0.05) 75%
          );
          background-size: 200% 100%;
          animation: loading 1.5s ease-in-out infinite;
        }

        @keyframes loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        /* Improved mobile tap targets */
        @media (max-width: 768px) {
          button,
          a,
          input,
          select {
            min-height: 44px;
            min-width: 44px;
          }
        }

        /* Print styles */
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            background: white !important;
          }
          
          .bg-gradient-to-br,
          .bg-gradient-to-r {
            background: white !important;
            color: black !important;
          }
        }

        /* Smooth scroll behavior */
        html {
          scroll-behavior: smooth;
        }

        /* Custom checkbox styles */
        input[type="checkbox"] {
          appearance: none;
          -webkit-appearance: none;
          cursor: pointer;
          position: relative;
        }

        input[type="checkbox"]:checked::before {
          content: '✓';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 12px;
          font-weight: bold;
        }

        /* Improved table styles */
        table {
          border-collapse: separate;
          border-spacing: 0;
        }

        /* Better text selection */
        ::selection {
          background-color: rgba(232, 69, 69, 0.3);
          color: white;
        }

        /* Focus visible for accessibility */
        *:focus-visible {
          outline: 2px solid #E84545;
          outline-offset: 2px;
        }

        /* Reduced motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </MainLayout>
  );
}