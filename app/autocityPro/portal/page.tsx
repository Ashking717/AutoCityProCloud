'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  ShoppingBag,
  CreditCard,
  ArrowRight,
  Package,
  Receipt,
  TrendingUp,
  BarChart3,
  DollarSign,
  FileText,
  PlusCircle,
  History,
  Settings,
  Users,
  Calendar,
  Tag,
  Truck,
  Grid,
  UserPlus,
  Layers,
  FolderPlus,
  ClipboardList,
  Search,
  Filter,
  X,
  MoreVertical,
  ChevronLeft,
  FileDown,
  AlertTriangle,
  Zap,
  TrendingDown,
} from "lucide-react";
import toast from "react-hot-toast";

export default function PurchasesPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quickActions, setQuickActions] = useState([
    {
      id: 1,
      title: "New Purchase",
      shortTitle: "Purchase",
      description: "Add new inventory purchase",
      icon: ShoppingBag,
      gradient: "from-[#E84545] to-[#cc3c3c]",
      href: "/autocityPro/purchases/new",
      shortcut: "Ctrl+P",
    },
    {
      id: 2,
      title: "View/Record Expense",
      shortTitle: "Expense",
      description: "Record business expense",
      icon: CreditCard,
      gradient: "from-purple-500 to-pink-600",
      href: "/autocityPro/expenses",
      shortcut: "Ctrl+E",
    },
    {
      id: 3,
      title: "Manage Categories",
      shortTitle: "Categories",
      description: "Add/edit product categories",
      icon: Tag,
      gradient: "from-blue-500 to-cyan-600",
      href: "/autocityPro/categories",
      shortcut: "Ctrl+C",
    },
    {
      id: 4,
      title: "Manage Suppliers",
      shortTitle: "Suppliers",
      description: "Add/edit supplier information",
      icon: Truck,
      gradient: "from-orange-500 to-red-600",
      href: "/autocityPro/suppliers",
      shortcut: "Ctrl+S",
    },
    {
      id: 5,
      title: "View Purchases",
      shortTitle: "History",
      description: "Browse purchase history",
      icon: History,
      gradient: "from-green-500 to-emerald-600",
      href: "/autocityPro/purchases",
      shortcut: "Ctrl+Shift+P",
    },
    {
      id: 6,
      title: "Inventory Movements",
      shortTitle: "Movements",
      description: "Track inventory movements",
      icon: Package,
      gradient: "from-blue-500 to-cyan-600",
      href: "/autocityPro/inventory-movements",
      shortcut: "Ctrl+M",
    },
    {
    id: 7,
    title: "Activity Logs",
    shortTitle: "Activity",
    description: "View system activity logs",
    icon: ClipboardList,
    gradient: "from-indigo-500 to-purple-600",
    href: "/autocityPro/activity-logs",
    shortcut: "Ctrl+L",
  }
  ]);
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalExpenses: 0,
    pendingBills: 0,
    todayPurchases: 0,
    totalCategories: 0,
    totalSuppliers: 0,
    activeSuppliers: 0,
  });
  const [recentCategories, setRecentCategories] = useState<any[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);

  useEffect(() => {
    fetchUser();
    fetchStats();
    fetchRecentCategories();
    fetchTopSuppliers();
    fetchRecentTransactions();

    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      let handled = false;
      if (isCtrl && !isShift) {
        switch (e.key.toLowerCase()) {
          case "p":
            e.preventDefault();
            router.push("/autocityPro/purchases/new");
            handled = true;
            break;
          case "e":
            e.preventDefault();
            router.push("/autocityPro/expenses/new");
            handled = true;
            break;
          case "c":
            e.preventDefault();
            router.push("/autocityPro/categories");
            handled = true;
            break;
          case "s":
            e.preventDefault();
            router.push("/autocityPro/suppliers");
            handled = true;
            break;
        }
      } else if (isCtrl && isShift) {
        switch (e.key.toLowerCase()) {
          case "p":
            e.preventDefault();
            router.push("/autocityPro/purchases");
            handled = true;
            break;
          case "e":
            e.preventDefault();
            router.push("/autocityPro/expenses");
            handled = true;
            break;
          case "c":
            e.preventDefault();
            router.push("/autocityPro/categories/new");
            handled = true;
            break;
          case "s":
            e.preventDefault();
            router.push("/autocityPro/suppliers/new");
            handled = true;
            break;
        }
      }
      if (handled) {
        toast.success("Navigating...");
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [router]);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("Failed to fetch user");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/purchases/stats", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || {
          totalPurchases: 0,
          totalExpenses: 0,
          pendingBills: 0,
          todayPurchases: 0,
          totalCategories: 0,
          totalSuppliers: 0,
          activeSuppliers: 0,
        });
      } else {
        console.error("Failed to load stats");
      }
    } catch (error) {
      console.error("Failed to fetch stats", error);
    }
  };

  const fetchRecentCategories = async () => {
    try {
      const res = await fetch("/api/categories?sort=createdAt&order=desc&limit=5", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setRecentCategories(data.categories || []);
      } else {
        console.error("Failed to load recent categories");
      }
    } catch (error) {
      console.error("Failed to fetch categories", error);
    }
  };

  const fetchTopSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers/top?limit=5", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTopSuppliers(data.suppliers || []);
      } else {
        console.error("Failed to load top suppliers");
      }
    } catch (error) {
      console.error("Failed to fetch suppliers", error);
    }
  };

  const fetchRecentTransactions = async () => {
    try {
      // Fetch recent purchases
      const purchasesRes = await fetch("/api/purchases/portal?sort=createdAt&order=desc&limit=3", { credentials: "include" });
      const purchases = purchasesRes.ok ? (await purchasesRes.json()).purchases || [] : [];

      // Fetch recent expenses
      const expensesRes = await fetch("/api/expenses?sort=createdAt&order=desc&limit=3", { credentials: "include" });
      const expenses = expensesRes.ok ? (await expensesRes.json()).expenses || [] : [];

      // Combine and format transactions
      const combined = [
        ...purchases.map((p: any) => ({
          id: `purchase-${p.id}`,
          type: 'purchase',
          vendor: p.supplier_name || p.vendor || 'Unknown Supplier',
          category: null,
          amount: p.amount || p.total_amount || 0,
          date: p.created_at || p.date || new Date().toISOString().split('T')[0],
          status: p.status || 'complete'
        })),
        ...expenses.map((e: any) => ({
          id: `expense-${e.id}`,
          type: 'expense',
          vendor: null,
          category: e.category || e.expense_category || 'General',
          amount: e.grandTotal ?? 0,

          date: e.created_at || e.date || new Date().toISOString().split('T')[0],
          status: e.status || 'complete'
        }))
      ];

      // Sort by date and limit to 5 most recent
      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentTransactions(combined.slice(0, 5));
    } catch (error) {
      console.error("Failed to fetch transactions", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-QA", {
      style: "currency",
      currency: "QAR",
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

  const handleAddCategory = () => {
    router.push("/autocityPro/categories/new");
  };

  const handleAddSupplier = () => {
    router.push("/autocityPro/suppliers/new");
  };

  const filteredRecentCategories = recentCategories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTopSuppliers = topSuppliers.filter(sup =>
    sup.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRecentTransactions = recentTransactions.filter(trans =>
    (trans.vendor || trans.category || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterType === "all" || trans.type === filterType)
  );

  const clearFilters = () => {
    setFilterType("all");
    setSearchTerm("");
  };

  const downloadCSV = (type: string) => {
    let data: any[] = [];
    let headers: string[] = [];
    switch (type) {
      case 'categories':
        data = filteredRecentCategories;
        headers = ["Name", "Product Count", "Created At"];
        break;
      case 'suppliers':
        data = filteredTopSuppliers;
        headers = ["Name", "Total Purchases", "Pending Amount", "Rating"];
        break;
      case 'transactions':
        data = filteredRecentTransactions;
        headers = ["Type", "Vendor/Category", "Amount", "Date", "Status"];
        break;
    }
    if (data.length === 0) {
      toast.error(`No ${type} data to export`);
      return;
    }
    const rows = data.map(item => Object.values(item).slice(1));
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${type}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${data.length} ${type} to CSV`);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
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
                  <ShoppingBag className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">{stats.totalPurchases}</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3 w-3 text-purple-400" />
                  <span className="text-white text-xs font-medium">{formatCompactCurrency(stats.totalExpenses)}</span>
                </div>
                {stats.pendingBills > 0 && (
                  <>
                    <div className="h-3 w-px bg-white/20"></div>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                      <span className="text-orange-400 text-xs font-medium">{stats.pendingBills}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header - Compact */}
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
                  <p className="text-xs text-white/60">Manage inventory</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileMenu(true)}
                className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/70" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/70 text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-xl">
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white">Purchases, Expenses & Inventory</h1>
                <p className="text-white/80 mt-1">Manage purchases, expenses, categories, and suppliers in one place</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => downloadCSV('categories')} 
                  className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-colors border border-white/20"
                >
                  <FileDown className="h-5 w-5" />
                  <span>Categories CSV</span>
                </button>
                <button 
                  onClick={() => downloadCSV('suppliers')} 
                  className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-colors border border-white/20"
                >
                  <FileDown className="h-5 w-5" />
                  <span>Suppliers CSV</span>
                </button>
                <button 
                  onClick={() => downloadCSV('transactions')} 
                  className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-colors border border-white/20"
                >
                  <FileDown className="h-5 w-5" />
                  <span>Transactions CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[180px] md:pt-6 pb-6">
          {/* Search and Filters - Desktop */}
          <div className="hidden md:block space-y-4 mb-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-5 w-5 text-[#E84545]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search purchases, expenses, categories, suppliers..."
                  className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-gray-400"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 border border-white/10 rounded-lg transition-colors ${
                  showFilters ? "bg-[#E84545]/20 text-white border-[#E84545]/30" : "hover:bg-white/5 text-white"
                }`}
              >
                <Filter className="h-5 w-5" />
                <span>Filters</span>
              </button>
            </div>
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Transaction Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                  >
                    <option value="all" className="text-[#050505]">All Transactions</option>
                    <option value="purchase" className="text-[#050505]">Purchases</option>
                    <option value="expense" className="text-[#050505]">Expenses</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={clearFilters} 
                    className="w-full px-4 py-2 bg-[#E84545]/10 border border-[#E84545]/30 rounded-lg hover:bg-[#E84545]/20 text-white transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Filter Modal */}
          {showFilters && (
            <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200">
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#0A0A0A] to-[#050505] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Transaction Type</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                    >
                      <option value="all" className="text-[#050505]">All Transactions</option>
                      <option value="purchase" className="text-[#050505]">Purchases</option>
                      <option value="expense" className="text-[#050505]">Expenses</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={clearFilters} 
                      className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 hover:text-white transition-colors active:scale-95"
                    >
                      Clear
                    </button>
                    <button 
                      onClick={() => setShowFilters(false)} 
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-xl text-white font-semibold active:scale-95 transition-all"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] rounded-2xl border border-white/10 p-4 hover:border-[#E84545]/30 transition-all shadow-lg active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 md:p-2.5 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-xl shadow-lg">
                  <ShoppingBag className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </div>
              </div>
              <p className="text-xs md:text-sm text-gray-400 mb-1">Purchases</p>
              <p className="text-xl md:text-2xl font-bold text-white">{stats.totalPurchases}</p>
            </div>
            
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] rounded-2xl border border-white/10 p-4 hover:border-purple-500/30 transition-all shadow-lg active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 md:p-2.5 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg">
                  <CreditCard className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </div>
              </div>
              <p className="text-xs md:text-sm text-gray-400 mb-1">Expenses</p>
              <p className="text-lg md:text-xl font-bold text-white">{formatCompactCurrency(stats.totalExpenses)}</p>
            </div>
            
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] rounded-2xl border border-white/10 p-4 hover:border-orange-500/30 transition-all shadow-lg active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 md:p-2.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl shadow-lg">
                  <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </div>
              </div>
              <p className="text-xs md:text-sm text-gray-400 mb-1">Pending</p>
              <p className="text-xl md:text-2xl font-bold text-white">{stats.pendingBills}</p>
            </div>
            
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] rounded-2xl border border-white/10 p-4 hover:border-blue-500/30 transition-all shadow-lg active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 md:p-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl shadow-lg">
                  <Calendar className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </div>
              </div>
              <p className="text-xs md:text-sm text-gray-400 mb-1">Today</p>
              <p className="text-xl md:text-2xl font-bold text-white">{stats.todayPurchases}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-lg md:text-2xl font-bold text-white">Quick Actions</h2>
              <p className="hidden md:block text-sm text-gray-400">
                Press <kbd className="px-2 py-1 bg-[#0A0A0A] rounded text-xs border border-white/10">?</kbd> for shortcuts
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => router.push(action.href)}
                  className="group bg-gradient-to-br from-[#0A0A0A] to-[#050505] rounded-2xl p-4 md:p-5 border border-white/10 hover:border-white/20 hover:shadow-xl hover:shadow-[#E84545]/5 transition-all duration-300 text-left active:scale-[0.98]"
                >
                  <div className="flex flex-col gap-3">
                    <div className={`p-2 md:p-2.5 bg-gradient-to-r ${action.gradient} rounded-xl w-fit shadow-lg`}>
                      <action.icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm md:text-base font-semibold text-white mb-1">
                        <span className="md:hidden">{action.shortTitle}</span>
                        <span className="hidden md:inline">{action.title}</span>
                      </h3>
                      <p className="text-[10px] md:text-xs text-gray-400 line-clamp-2 mb-2 md:mb-3">{action.description}</p>
                      <div className="flex items-center text-[#E84545] group-hover:text-[#cc3c3c] transition-colors">
                        <span className="text-xs font-medium">Go</span>
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Categories */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold text-white">Recent Categories</h2>
              <button 
                onClick={handleAddCategory} 
                className="flex items-center space-x-2 text-[#E84545] hover:text-[#cc3c3c] active:scale-95 transition-all"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="text-sm">Add New</span>
              </button>
            </div>
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] rounded-2xl shadow-xl overflow-hidden border border-white/10">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/5 md:table hidden">
                  <thead className="bg-[#050505]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Product Count</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredRecentCategories.length > 0 ? (
                      filteredRecentCategories.map((cat) => (
                        <tr key={cat.id} className="hover:bg-white/2 transition-colors">
                          <td className="px-6 py-4 text-sm text-white">{cat.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{cat.productCount}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{cat.createdAt}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                          <Tag className="h-10 w-10 mx-auto mb-2 text-gray-600" />
                          <p className="text-sm">No categories found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {/* Mobile Card Layout */}
                <div className="md:hidden divide-y divide-white/5">
                  {filteredRecentCategories.length > 0 ? (
                    filteredRecentCategories.map((cat) => (
                      <div key={cat.id} className="p-4 hover:bg-white/2 transition-colors active:bg-white/5">
                        <p className="text-sm font-medium text-white mb-1">{cat.name}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>Products: {cat.productCount}</span>
                          <span>•</span>
                          <span>{cat.createdAt}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-400">
                      <Tag className="h-10 w-10 mx-auto mb-2 text-gray-600" />
                      <p className="text-sm">No categories found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Top Suppliers */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold text-white">Top Suppliers</h2>
              <button 
                onClick={handleAddSupplier} 
                className="flex items-center space-x-2 text-[#E84545] hover:text-[#cc3c3c] active:scale-95 transition-all"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="text-sm">Add New</span>
              </button>
            </div>
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] rounded-2xl shadow-xl overflow-hidden border border-white/10">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/5 md:table hidden">
                  <thead className="bg-[#050505]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total Purchases</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Pending Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTopSuppliers.length > 0 ? (
                      filteredTopSuppliers.map((sup) => (
                        <tr key={sup.id} className="hover:bg-white/2 transition-colors">
                          <td className="px-6 py-4 text-sm text-white">{sup.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{formatCurrency(sup.totalPurchases)}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{formatCurrency(sup.pendingAmount)}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{sup.rating}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                          <Truck className="h-10 w-10 mx-auto mb-2 text-gray-600" />
                          <p className="text-sm">No suppliers found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {/* Mobile Card Layout */}
                <div className="md:hidden divide-y divide-white/5">
                  {filteredTopSuppliers.length > 0 ? (
                    filteredTopSuppliers.map((sup) => (
                      <div key={sup.id} className="p-4 hover:bg-white/2 transition-colors active:bg-white/5">
                        <p className="text-sm font-medium text-white mb-2">{sup.name}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Total:</span>
                            <p className="text-gray-300 font-medium">{formatCompactCurrency(sup.totalPurchases)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Pending:</span>
                            <p className="text-gray-300 font-medium">{formatCompactCurrency(sup.pendingAmount)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Rating:</span>
                            <p className="text-yellow-400 font-medium">{sup.rating} ⭐</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-400">
                      <Truck className="h-10 w-10 mx-auto mb-2 text-gray-600" />
                      <p className="text-sm">No suppliers found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="mb-6 md:mb-8">
            <h2 className="text-lg md:text-xl font-bold text-white mb-4">Recent Transactions</h2>
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] rounded-2xl shadow-xl overflow-hidden border border-white/10">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/5 md:table hidden">
                  <thead className="bg-[#050505]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Vendor/Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredRecentTransactions.length > 0 ? (
                      filteredRecentTransactions.map((trans) => (
                        <tr key={trans.id} className="hover:bg-white/2 transition-colors">
                          <td className="px-6 py-4 text-sm text-white capitalize">{trans.type}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{trans.vendor || trans.category}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{formatCurrency(trans.amount)}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{trans.date}</td>
                          <td className="px-6 py-4 text-sm text-gray-300 capitalize">{trans.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                          <History className="h-10 w-10 mx-auto mb-2 text-gray-600" />
                          <p className="text-sm">No transactions found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {/* Mobile Card Layout */}
                <div className="md:hidden divide-y divide-white/5">
                  {filteredRecentTransactions.length > 0 ? (
                    filteredRecentTransactions.map((trans) => (
                      <div key={trans.id} className="p-4 hover:bg-white/2 transition-colors active:bg-white/5">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-white capitalize">{trans.type}</p>
                            <p className="text-xs text-gray-400">{trans.vendor || trans.category}</p>
                          </div>
                          <span className="text-sm font-bold text-[#E84545]">{formatCompactCurrency(trans.amount)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{trans.date}</span>
                          <span>•</span>
                          <span className="capitalize">{trans.status}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-400">
                      <History className="h-10 w-10 mx-auto mb-2 text-gray-600" />
                      <p className="text-sm">No transactions found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Action Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#0A0A0A] to-[#050505] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl">
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
                  downloadCSV('categories');
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Export Categories</span>
                <FileDown className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  downloadCSV('suppliers');
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Export Suppliers</span>
                <FileDown className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  downloadCSV('transactions');
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Export Transactions</span>
                <FileDown className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  setShowFilters(true);
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Filters</span>
                <Filter className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Safe Area Bottom Padding */}
      <div className="md:hidden h-6"></div>

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
      `}</style>
    </MainLayout>
  );
}