// app/autocityPro/purchases/page.tsx
'use client';
import { useState, useEffect } from 'react';
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
}

interface Supplier {
  _id: string;
  name: string;
}

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
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);

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

  const filteredPurchases = purchases.filter((purchase) => {
    const matchesSearch =
      purchase.purchaseNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.supplierName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Calculate statistics
  const stats = {
    total: filteredPurchases.length,
    totalAmount: filteredPurchases.reduce((sum, p) => sum + (p.grandTotal || 0), 0),
    totalPaid: filteredPurchases.reduce((sum, p) => sum + (p.amountPaid || 0), 0),
    totalDue: filteredPurchases.reduce((sum, p) => sum + (p.balanceDue || 0), 0),
  };

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
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "DRAFT":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "CANCELLED":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
        return <CheckCircle className="h-3 w-3" />;
      case "DRAFT":
        return <Clock className="h-3 w-3" />;
      case "CANCELLED":
        return <XCircle className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      CASH: "bg-green-500/10 text-green-400",
      CARD: "bg-blue-500/10 text-blue-400",
      BANK_TRANSFER: "bg-purple-500/10 text-purple-400",
      CREDIT: "bg-orange-500/10 text-orange-400",
    };
    return colors[method] || "bg-gray-500/10 text-gray-400";
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSupplierFilter("all");
    setDateRange({ startDate: "", endDate: "" });
    setShowFilters(false);
  };

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/10 border-t-[#E84545] mx-auto"></div>
          <p className="mt-4 text-white text-lg font-medium">Loading purchases...</p>
          <p className="text-gray-400 text-sm mt-2">Fetching purchase orders</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">{stats.total}</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3 text-green-400" />
                  <span className="text-white text-xs font-semibold">{formatCompactCurrency(stats.totalAmount)}</span>
                </div>
                {stats.totalDue > 0 && (
                  <>
                    <div className="h-3 w-px bg-white/20"></div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-orange-500" />
                      <span className="text-orange-400 text-xs font-medium">{formatCompactCurrency(stats.totalDue)}</span>
                    </div>
                  </>
                )}
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
                  onClick={() => router.back()}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">Purchases</h1>
                  <p className="text-xs text-white/60">{stats.total} orders</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(true)}
                  className="p-2 rounded-lg bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all relative"
                >
                  <Filter className="h-4 w-4" />
                  {(statusFilter !== 'all' || supplierFilter !== 'all' || dateRange.startDate || dateRange.endDate) && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-[#E84545] rounded-full"></span>
                  )}
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 rounded-lg bg-white/5 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-50 active:scale-95 transition-all"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => router.push('/autocityPro/purchases/new')}
                  className="p-2 rounded-lg bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white hover:opacity-90 active:scale-95 transition-all shadow-lg"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Mobile Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search purchases..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 focus:border-[#E84545]/50 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-11 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-xl">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                  <ShoppingCart className="h-8 w-8 text-[#E84545]" />
                  Purchases
                </h1>
                <p className="text-white/90 mt-2">Manage your purchase orders</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-3 bg-[#0A0A0A]/50 border border-white/5 rounded-xl hover:bg-[#0A0A0A] hover:border-[#E84545]/30 transition-all disabled:opacity-50 backdrop-blur-sm shadow-lg"
                >
                  <RefreshCw className={`h-5 w-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => router.push('/autocityPro/purchases/new')}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg"
                >
                  <Plus className="h-5 w-5" />
                  New Purchase
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Narrower with max-w-7xl */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-[160px] md:pt-6 pb-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-4 hover:border-[#E84545]/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="bg-gradient-to-r from-[#E84545] to-[#cc3c3c] p-2.5 rounded-xl shadow-lg">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
              </div>
              <h3 className="text-gray-400 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1.5">
                Total Orders
              </h3>
              <p className="text-xl md:text-2xl font-bold text-white">{stats.total}</p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-4 hover:border-green-500/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-2.5 rounded-xl shadow-lg">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
              </div>
              <h3 className="text-gray-400 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1.5">
                Total Amount
              </h3>
              <p className="text-xl md:text-2xl font-bold text-white truncate">{formatCompactCurrency(stats.totalAmount)}</p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-4 hover:border-blue-500/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-2.5 rounded-xl shadow-lg">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
              </div>
              <h3 className="text-gray-400 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1.5">
                Total Paid
              </h3>
              <p className="text-xl md:text-2xl font-bold text-white truncate">{formatCompactCurrency(stats.totalPaid)}</p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-4 hover:border-orange-500/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className={`bg-gradient-to-r ${stats.totalDue > 0 ? 'from-orange-500 to-red-600' : 'from-green-500 to-emerald-600'} p-2.5 rounded-xl shadow-lg`}>
                  <AlertCircle className="h-4 w-4 text-white" />
                </div>
                {stats.totalDue > 0 && (
                  <div className="animate-pulse h-2 w-2 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50"></div>
                )}
              </div>
              <h3 className="text-gray-400 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1.5">
                Balance Due
              </h3>
              <p className={`text-xl md:text-2xl font-bold truncate ${stats.totalDue > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                {formatCompactCurrency(stats.totalDue)}
              </p>
            </div>
          </div>

          {/* Desktop Filters */}
          <div className="hidden md:block mb-6">
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search purchases..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 focus:border-[#E84545]/50"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 focus:border-[#E84545]/50"
                >
                  <option value="all">All Status</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DRAFT">Draft</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 focus:border-[#E84545]/50"
                >
                  <option value="all">All Suppliers</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier._id} value={supplier._id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E84545]/50 focus:border-[#E84545]/50"
                />

                <button
                  onClick={clearFilters}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 hover:border-[#E84545]/30 transition-all font-medium"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Purchases List - Mobile Optimized Cards */}
          {isMobile ? (
            <div className="space-y-3">
              {filteredPurchases.length === 0 ? (
                <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-8 text-center">
                  <ShoppingCart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No Purchases Found</h3>
                  <p className="text-gray-400 mb-6">Create your first purchase order</p>
                  <button
                    onClick={() => router.push('/autocityPro/purchases/new')}
                    className="px-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold hover:opacity-90 transition-all inline-flex items-center gap-2 shadow-lg"
                  >
                    <Plus className="h-5 w-5" />
                    New Purchase
                  </button>
                </div>
              ) : (
                filteredPurchases.map((purchase) => (
                  <div
                    key={purchase._id}
                    onClick={() => router.push(`/autocityPro/purchases/${purchase._id}`)}
                    className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-4 hover:border-[#E84545]/30 active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-bold text-sm truncate">{purchase.purchaseNumber}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${getStatusColor(purchase.status)}`}>
                            {getStatusIcon(purchase.status)}
                            {purchase.status}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs truncate">{purchase.supplierName}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3 p-3 bg-white/5 rounded-xl">
                      <div>
                        <p className="text-gray-500 text-[10px] mb-0.5">Total Amount</p>
                        <p className="text-white font-bold text-sm">{formatCompactCurrency(purchase.grandTotal)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-[10px] mb-0.5">Balance Due</p>
                        <p className={`font-bold text-sm ${purchase.balanceDue > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                          {formatCompactCurrency(purchase.balanceDue)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${getPaymentMethodColor(purchase.paymentMethod)}`}>
                          {purchase.paymentMethod?.replace('_', ' ')}
                        </span>
                        <span className="text-gray-500 text-[10px]">
                          {purchase.items?.length || 0} items
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 text-[10px]">
                          {new Date(purchase.purchaseDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Desktop Table
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Purchase #</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Items</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Paid</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Balance</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Payment</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredPurchases.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center">
                          <ShoppingCart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                          <h3 className="text-xl font-bold text-white mb-2">No Purchases Found</h3>
                          <p className="text-gray-400 mb-6">Create your first purchase order</p>
                          <button
                            onClick={() => router.push('/autocityPro/purchases/new')}
                            className="px-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-semibold hover:opacity-90 transition-all inline-flex items-center gap-2 shadow-lg"
                          >
                            <Plus className="h-5 w-5" />
                            New Purchase
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredPurchases.map((purchase) => (
                        <tr
                          key={purchase._id}
                          className="hover:bg-white/5 transition-all cursor-pointer"
                          onClick={() => router.push(`/autocityPro/purchases/${purchase._id}`)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E84545] to-[#cc3c3c] flex items-center justify-center">
                                <FileText className="h-4 w-4 text-white" />
                              </div>
                              <span className="text-white font-semibold">{purchase.purchaseNumber}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-white text-sm">{new Date(purchase.purchaseDate).toLocaleDateString()}</p>
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
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-lg w-fit">
                              <Package className="h-3 w-3 text-gray-400" />
                              <span className="text-white text-sm">{purchase.items?.length || 0}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-white font-semibold">{formatCurrency(purchase.grandTotal)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-green-400 font-semibold">{formatCurrency(purchase.amountPaid)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-semibold ${purchase.balanceDue > 0 ? 'text-orange-400' : 'text-gray-500'}`}>
                              {formatCurrency(purchase.balanceDue)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${getPaymentMethodColor(purchase.paymentMethod)}`}>
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/autocityPro/purchases/${purchase._id}`);
                              }}
                              className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-[#E84545]/10 hover:text-[#E84545] transition-all"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary Footer */}
          {filteredPurchases.length > 0 && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-xl p-4">
                <p className="text-gray-400 text-xs mb-1">Total Purchases</p>
                <p className="text-white font-bold text-lg">{stats.total}</p>
              </div>
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-xl p-4">
                <p className="text-gray-400 text-xs mb-1">Total Amount</p>
                <p className="text-white font-bold text-lg">{formatCompactCurrency(stats.totalAmount)}</p>
              </div>
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-xl p-4">
                <p className="text-gray-400 text-xs mb-1">Total Paid</p>
                <p className="text-green-400 font-bold text-lg">{formatCompactCurrency(stats.totalPaid)}</p>
              </div>
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-xl p-4">
                <p className="text-gray-400 text-xs mb-1">Balance Due</p>
                <p className={`font-bold text-lg ${stats.totalDue > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                  {formatCompactCurrency(stats.totalDue)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Filter Modal */}
        {showFilters && (
          <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-[60] animate-in fade-in duration-200">
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#0A0A0A] to-[#050505] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Filters</h2>
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
                    <option value="COMPLETED">Completed</option>
                    <option value="DRAFT">Draft</option>
                    <option value="CANCELLED">Cancelled</option>
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

        {/* Mobile Menu Modal */}
        {showMobileMenu && (
          <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-[60] animate-in fade-in duration-200">
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#0A0A0A] to-[#050505] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Menu</h2>
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
                    toast.success("Exporting purchases...");
                    setShowMobileMenu(false);
                  }}
                  className="w-full p-4 bg-[#0A0A0A]/50 border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-[0.98]"
                >
                  <span>Export Data</span>
                  <Download className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Safe Area Bottom Padding */}
      <div className="md:hidden h-6"></div>

      {/* Custom Styles */}
      <style jsx global>{`
        @supports (padding: max(0px)) {
          .md\\:hidden.fixed.top-16 {
            padding-top: max(12px, env(safe-area-inset-top));
          }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
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
      `}</style>
    </MainLayout>
  );
}