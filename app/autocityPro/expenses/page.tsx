// File: app/autocityPro/expenses/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import CreateExpenseForm from "@/components/expenses/CreateExpenseForm";
import {
  Plus,
  Receipt,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Loader2,
  Trash2,
  Edit,
  Eye,
  Zap,
  Home,
  Users,
  Wrench,
  Megaphone,
  FileText,
  ChevronLeft,
  MoreVertical,
  X,
  Download,
  AlertTriangle,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

const EXPENSE_CATEGORIES = [
  { value: "UTILITY", label: "Utility Bills", icon: Zap, color: "yellow" },
  { value: "RENT", label: "Rent", icon: Home, color: "purple" },
  { value: "SALARY", label: "Salaries & Wages", icon: Users, color: "blue" },
  { value: "MAINTENANCE", label: "Maintenance", icon: Wrench, color: "orange" },
  { value: "MARKETING", label: "Marketing", icon: Megaphone, color: "pink" },
  {
    value: "OFFICE_SUPPLIES",
    label: "Office Supplies",
    icon: FileText,
    color: "green",
  },
  {
    value: "TRANSPORTATION",
    label: "Transportation",
    icon: Receipt,
    color: "indigo",
  },
  {
    value: "PROFESSIONAL_FEES",
    label: "Professional Fees",
    icon: DollarSign,
    color: "teal",
  },
  { value: "OTHER", label: "Other Expenses", icon: Receipt, color: "gray" },
];

export default function ExpensesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Filters
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchUser();
    fetchExpenses();

    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) return `QR${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 10000) return `QR${(amount / 1000).toFixed(1)}K`;
    return `QR${amount.toFixed(0)}`;
  };

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

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append("category", filters.category);
      if (filters.status) params.append("status", filters.status);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await fetch(`/api/expenses?${params}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
      } else {
        toast.error("Failed to fetch expenses");
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryConfig = (category: string) => {
    return (
      EXPENSE_CATEGORIES.find((c) => c.value === category) ||
      EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-900/20 text-green-400 border border-green-800/50";
      case "PARTIALLY_PAID":
        return "bg-yellow-900/20 text-yellow-400 border border-yellow-800/50";
      case "PENDING":
        return "bg-blue-900/20 text-blue-400 border border-blue-800/50";
      case "CANCELLED":
        return "bg-red-900/20 text-red-400 border border-red-800/50";
      default:
        return "bg-gray-900/20 text-gray-400 border border-gray-800/50";
    }
  };

  // Calculate summary
  const summary = expenses.reduce(
    (acc, exp) => {
      acc.total += exp.grandTotal || 0;
      acc.paid += exp.amountPaid || 0;
      acc.outstanding += exp.balanceDue || 0;
      acc.pending = expenses.filter(e => e.status === "PENDING").length;
      return acc;
    },
    { total: 0, paid: 0, outstanding: 0, pending: 0 }
  );

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch = searchTerm === "" || 
      exp.expenseNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCategoryConfig(exp.category).label.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        router.push("/login");
      } else {
        toast.error("Failed to logout");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Error logging out");
    }
  };

  const clearFilters = () => {
    setFilters({
      category: "",
      status: "",
      startDate: "",
      endDate: "",
    });
    setSearchTerm("");
  };

  const downloadExpensesCSV = () => {
    if (filteredExpenses.length === 0) {
      toast.error("No expenses data to export");
      return;
    }
    const headers = ["Expense #", "Date", "Category", "Vendor", "Total Amount", "Paid", "Balance", "Status"];
    const rows = filteredExpenses.map(exp => [
      exp.expenseNumber || "",
      new Date(exp.expenseDate).toLocaleDateString(),
      getCategoryConfig(exp.category).label,
      exp.vendorName || "",
      exp.grandTotal || 0,
      exp.amountPaid || 0,
      exp.balanceDue || 0,
      exp.status || ""
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredExpenses.length} expenses to CSV`);
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
                  <Receipt className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">{formatCompactCurrency(summary.total)}</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-xs font-medium">{expenses.length} expenses</span>
                </div>
                {summary.pending > 0 && (
                  <>
                    <div className="h-3 w-px bg-white/20"></div>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-[#E84545]" />
                      <span className="text-[#E84545] text-xs font-medium">{summary.pending}</span>
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
                  <h1 className="text-xl font-bold text-white">Expenses</h1>
                  <p className="text-xs text-white/60">{filteredExpenses.length} records</p>
                </div>
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
                placeholder="Search expenses..."
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
                <Receipt className="h-8 w-8 text-white" />
                <div>
                  <h1 className="text-3xl font-bold text-white">Expenses Management</h1>
                  <p className="text-white/80 mt-1">Track and manage business expenses</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={downloadExpensesCSV}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all group"
                >
                  <Download className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] border border-[#E84545]/30 text-white rounded-lg hover:opacity-90 transition-all group"
                >
                  <Plus className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Record Expense</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[180px] md:pt-6 pb-6">
          {/* Stats Cards - Mobile Optimized */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <Receipt className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Total Expenses</p>
              <p className="text-lg md:text-xl font-bold text-white truncate">
                {formatCompactCurrency(summary.total)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Total Paid</p>
              <p className="text-lg md:text-xl font-bold text-green-400 truncate">
                {formatCompactCurrency(summary.paid)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Outstanding</p>
              <p className="text-lg md:text-xl font-bold text-[#E84545] truncate">
                {formatCompactCurrency(summary.outstanding)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Pending</p>
              <p className="text-lg md:text-xl font-bold text-[#E84545]">
                {summary.pending}
              </p>
            </div>
          </div>

          {/* Pending Expenses Alert */}
          {summary.pending > 0 && (
            <div className="bg-[#E84545]/10 border-l-4 border-[#E84545] p-4 md:p-6 mb-6 rounded-xl border border-[#E84545]/20 active:scale-[0.98] transition-all">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-[#E84545] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-white">
                    {summary.pending} pending expenses
                  </h3>
                  <p className="text-sm text-slate-300 mt-1">
                    There are unpaid expenses requiring attention. Review and process payments.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Filters */}
          <div className="hidden md:block bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-xl shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) =>
                    setFilters({ ...filters, category: e.target.value })
                  }
                  className="w-full px-3 py-2.5 bg-[#050505] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                >
                  <option value="">All Categories</option>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                  className="w-full px-3 py-2.5 bg-[#050505] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                >
                  <option value="">All Status</option>
                  <option value="PAID">Paid</option>
                  <option value="PARTIALLY_PAID">Partially Paid</option>
                  <option value="PENDING">Pending</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters({ ...filters, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2.5 bg-[#050505] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters({ ...filters, endDate: e.target.value })
                  }
                  className="w-full px-3 py-2.5 bg-[#050505] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={fetchExpenses}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-[#050505] border border-white/10 text-white rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Filter className="w-4 h-4" />
                  )}
                  <span>Filter</span>
                </button>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2.5 bg-[#050505] border border-white/10 text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Expenses List */}
          <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-xl overflow-hidden">
            <div className="hidden md:flex px-6 py-4 border-b border-white/10 items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Recent Expenses</h2>
                <p className="text-sm text-slate-400 mt-1">{filteredExpenses.length} records found</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search expenses..."
                  className="w-64 pl-10 pr-3 py-2 bg-[#050505] border border-white/10 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-slate-400"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#E84545]"></div>
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400 text-lg font-medium">No expenses found</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 px-6 py-2.5 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:opacity-90 transition-opacity inline-flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record First Expense</span>
                </button>
              </div>
            ) : (
              <>
                {/* Mobile Card Layout */}
                <div className="md:hidden divide-y divide-white/10 p-4 space-y-3">
                  {filteredExpenses.map((expense) => {
                    const categoryConfig = getCategoryConfig(expense.category);
                    const CategoryIcon = categoryConfig.icon;

                    return (
                      <div
                        key={expense._id}
                        className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <CategoryIcon className="h-3 w-3 text-[#E84545]" />
                              <p className="text-sm font-semibold text-white truncate">
                                {expense.expenseNumber}
                              </p>
                            </div>
                            <p className="text-xs text-slate-500">
                              {new Date(expense.expenseDate).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(expense.status)}`}>
                            {expense.status.replace("_", " ")}
                          </span>
                        </div>

                        <div className="mb-3">
                          <p className="text-sm text-slate-200">{expense.vendorName || "No vendor"}</p>
                          <p className="text-xs text-slate-400 mt-1">{categoryConfig.label}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 py-3 border-t border-white/10">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block mb-1">Total</span>
                            <p className="text-sm font-semibold text-white">
                              QR {expense.grandTotal?.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block mb-1">Paid</span>
                            <p className="text-sm font-semibold text-green-400">
                              QR {expense.amountPaid?.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block mb-1">Balance</span>
                            <p className="text-sm font-semibold text-[#E84545]">
                              QR {expense.balanceDue?.toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-end justify-end">
                            <Link href={`/autocityPro/expenses/${expense._id}`}>
                              <button className="p-2 rounded-lg bg-white/5 text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                                <Eye className="h-3 w-3" />
                              </button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10 text-sm">
                    <thead className="bg-[#050505]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Expense #</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Vendor</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Paid</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {filteredExpenses.map((expense) => {
                        const categoryConfig = getCategoryConfig(expense.category);
                        const CategoryIcon = categoryConfig.icon;

                        return (
                          <tr key={expense._id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 text-sm text-slate-300">
                              {new Date(expense.expenseDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-white">
                                {expense.expenseNumber}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-white/5 rounded">
                                  <CategoryIcon className="w-4 h-4 text-[#E84545]" />
                                </div>
                                <span className="text-sm text-slate-300">
                                  {categoryConfig.label}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-300">
                              {expense.vendorName || "-"}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <p className="text-sm font-semibold text-white">
                                QR {expense.grandTotal?.toLocaleString()}
                              </p>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <p className="text-sm text-green-400">
                                QR {expense.amountPaid?.toLocaleString()}
                              </p>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(expense.status)}`}>
                                {expense.status.replace("_", " ")}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Link href={`/autocityPro/expenses/${expense._id}`}>
                                  <button
                                    className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    title="View Details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-24"></div>
      </div>

      {/* Mobile Filter Modal */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#050505] to-[#0A0A0A] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300">
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
                <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                >
                  <option value="">All Categories</option>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                >
                  <option value="">All Status</option>
                  <option value="PAID">Paid</option>
                  <option value="PARTIALLY_PAID">Partially Paid</option>
                  <option value="PENDING">Pending</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">From Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">To Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    clearFilters();
                    setShowFilters(false);
                  }}
                  className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-lg text-gray-300 hover:text-white transition-colors active:scale-95"
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    fetchExpenses();
                    setShowFilters(false);
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-lg text-white font-semibold active:scale-95 transition-all"
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
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#050505] to-[#0A0A0A] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300">
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
                  setShowCreateModal(true);
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Record Expense</span>
                <Plus className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  downloadExpensesCSV();
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Export CSV</span>
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  fetchExpenses();
                  setShowMobileMenu(false);
                  toast.success('Expenses data refreshed');
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Refresh Data</span>
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateExpenseForm
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchExpenses}
        />
      )}
    </MainLayout>
  );
}