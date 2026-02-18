// File: app/autocityPro/expenses/page.tsx - WITH TIME-BASED LIGHT/DARK THEME
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import CreateExpenseForm from "@/components/expenses/CreateExpenseForm";
import {
  Plus, Receipt, Search, Filter, Calendar, DollarSign, Loader2,
  Trash2, Edit, Eye, Zap, Home, Users, Wrench, Megaphone, FileText,
  ChevronLeft, MoreVertical, X, Download, AlertTriangle, TrendingDown,
  RefreshCw, Sun, Moon,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

// ─── Time-based theme hook ────────────────────────────────────────────────────
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

const EXPENSE_CATEGORIES = [
  { value: "UTILITY", label: "Utility Bills", icon: Zap, color: "yellow" },
  { value: "RENT", label: "Rent", icon: Home, color: "purple" },
  { value: "SALARY", label: "Salaries & Wages", icon: Users, color: "blue" },
  { value: "MAINTENANCE", label: "Maintenance", icon: Wrench, color: "orange" },
  { value: "MARKETING", label: "Marketing", icon: Megaphone, color: "pink" },
  { value: "OFFICE_SUPPLIES", label: "Office Supplies", icon: FileText, color: "green" },
  { value: "TRANSPORTATION", label: "Transportation", icon: Receipt, color: "indigo" },
  { value: "PROFESSIONAL_FEES", label: "Professional Fees", icon: DollarSign, color: "teal" },
  { value: "OTHER", label: "Other Expenses", icon: Receipt, color: "gray" },
];

export default function ExpensesPage() {
  const router = useRouter();
  const isDark = useTimeBasedTheme();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ category: "", status: "", startDate: "", endDate: "" });

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    pageBg:           isDark ? '#050505'                                                    : '#f3f4f6',
    // Desktop header
    desktopHeaderBg:  isDark ? 'linear-gradient(135deg,#932222,#411010,#a20c0c)'           : 'linear-gradient(135deg,#fef2f2,#fee2e2,#fecaca)',
    desktopHeaderBorder: isDark ? 'rgba(255,255,255,0.05)'                                 : 'rgba(0,0,0,0.08)',
    desktopHeaderTitle: isDark ? '#ffffff'                                                  : '#7f1d1d',
    desktopHeaderSub: isDark ? 'rgba(255,255,255,0.80)'                                    : '#991b1b',
    // Mobile header
    mobileHeaderBg:   isDark ? 'linear-gradient(135deg,#0A0A0A,#050505,#0A0A0A)'          : 'linear-gradient(135deg,#ffffff,#f9fafb,#ffffff)',
    mobileHeaderBorder: isDark ? 'rgba(255,255,255,0.05)'                                  : 'rgba(0,0,0,0.08)',
    mobileHeaderTitle: isDark ? '#ffffff'                                                   : '#111827',
    mobileHeaderSub:  isDark ? 'rgba(255,255,255,0.60)'                                    : '#6b7280',
    mobileBtnBg:      isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.05)',
    mobileBtnText:    isDark ? 'rgba(255,255,255,0.80)'                                    : '#374151',
    // Mobile search
    mobileSearchBg:   isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.06)',
    mobileSearchBorder: isDark ? 'rgba(255,255,255,0.20)'                                  : 'rgba(0,0,0,0.12)',
    mobileSearchText: isDark ? '#ffffff'                                                    : '#111827',
    mobileSearchPH:   isDark ? 'rgba(255,255,255,0.70)'                                    : '#9ca3af',
    // Desktop header buttons
    desktopBtnBg:     isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(127,29,29,0.10)',
    desktopBtnBorder: isDark ? 'rgba(255,255,255,0.20)'                                    : 'rgba(127,29,29,0.25)',
    desktopBtnText:   isDark ? '#ffffff'                                                    : '#7f1d1d',
    // Cards
    cardBg:           isDark ? 'linear-gradient(135deg,#0A0A0A,#050505)'                   : 'linear-gradient(135deg,#ffffff,#f9fafb)',
    cardBorder:       isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
    cardBorderHover:  isDark ? 'rgba(232,69,69,0.30)'                                      : 'rgba(232,69,69,0.25)',
    // Stat cards inner
    statIconBg:       isDark ? 'rgba(232,69,69,0.10)'                                      : 'rgba(232,69,69,0.08)',
    statLabel:        isDark ? '#94a3b8'                                                    : '#6b7280',
    statValueWhite:   isDark ? '#ffffff'                                                    : '#111827',
    // Alert banner
    alertBg:          isDark ? 'rgba(232,69,69,0.10)'                                      : 'rgba(254,202,202,0.50)',
    alertBorder:      isDark ? 'rgba(232,69,69,0.20)'                                      : 'rgba(220,38,38,0.20)',
    alertText:        isDark ? '#ffffff'                                                    : '#7f1d1d',
    alertSub:         isDark ? '#cbd5e1'                                                    : '#991b1b',
    // Filter panel
    filterBg:         isDark ? 'linear-gradient(135deg,#0A0A0A,#050505)'                   : 'linear-gradient(135deg,#ffffff,#f9fafb)',
    filterBorder:     isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
    filterLabel:      isDark ? '#cbd5e1'                                                    : '#374151',
    // Inputs/selects
    inputBg:          isDark ? '#050505'                                                    : '#ffffff',
    inputBorder:      isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.12)',
    inputText:        isDark ? '#ffffff'                                                    : '#111827',
    // List panel
    listPanelBg:      isDark ? 'linear-gradient(135deg,#0A0A0A,#050505)'                   : 'linear-gradient(135deg,#ffffff,#f9fafb)',
    listPanelBorder:  isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
    listTitle:        isDark ? '#ffffff'                                                    : '#111827',
    listSubtitle:     isDark ? '#94a3b8'                                                    : '#6b7280',
    // Table
    tableHeadBg:      isDark ? '#050505'                                                    : '#f9fafb',
    tableHeadText:    isDark ? '#cbd5e1'                                                    : '#6b7280',
    tableRowDivider:  isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.06)',
    tableRowHover:    isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.02)',
    tableCellText:    isDark ? '#cbd5e1'                                                    : '#374151',
    tableCellTextPrimary: isDark ? '#ffffff'                                                : '#111827',
    // Mobile item card
    mobileItemBg:     isDark ? 'linear-gradient(135deg,#0A0A0A,#050505)'                   : 'linear-gradient(135deg,#ffffff,#f9fafb)',
    mobileItemBorder: isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
    mobileItemLabel:  isDark ? '#6b7280'                                                    : '#9ca3af',
    mobileItemText:   isDark ? '#ffffff'                                                    : '#111827',
    mobileItemRowBorder: isDark ? 'rgba(255,255,255,0.10)'                                 : 'rgba(0,0,0,0.06)',
    // Empty state
    emptyIcon:        isDark ? '#475569'                                                    : '#d1d5db',
    emptyText:        isDark ? '#94a3b8'                                                    : '#6b7280',
    // Modals
    modalOverlay:     isDark ? 'rgba(0,0,0,0.80)'                                          : 'rgba(0,0,0,0.50)',
    modalBg:          isDark ? 'linear-gradient(180deg,#050505,#0A0A0A)'                   : 'linear-gradient(180deg,#ffffff,#f9fafb)',
    modalBorder:      isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
    modalTitle:       isDark ? '#ffffff'                                                    : '#111827',
    modalCloseBg:     isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.05)',
    modalCloseText:   isDark ? '#9ca3af'                                                    : '#6b7280',
    modalItemBg:      isDark ? '#0A0A0A'                                                    : '#ffffff',
    modalItemBorder:  isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
    modalItemText:    isDark ? '#d1d5db'                                                    : '#374151',
    divider:          isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
  };

  const inputStyle = { background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText };
  const inputClass = "focus:ring-2 focus:ring-[#E84545] focus:border-transparent";

  useEffect(() => {
    fetchUser(); fetchExpenses();
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) return `QR${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 10000) return `QR${(amount / 1000).toFixed(1)}K`;
    return `QR${amount.toFixed(0)}`;
  };

  const fetchUser = async () => {
    try { const r = await fetch("/api/auth/me", { credentials: "include" }); if (r.ok) setUser((await r.json()).user); } catch {}
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append("category", filters.category);
      if (filters.status) params.append("status", filters.status);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      const r = await fetch(`/api/expenses?${params}`, { credentials: "include" });
      if (r.ok) setExpenses((await r.json()).expenses || []);
      else toast.error("Failed to fetch expenses");
    } catch { toast.error("Failed to load expenses"); }
    finally { setLoading(false); }
  };

  const getCategoryConfig = (category: string) =>
    EXPENSE_CATEGORIES.find(c => c.value === category) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];

  const getStatusColor = (status: string) => {
    if (isDark) {
      switch (status) {
        case "PAID":          return "bg-green-900/20 text-green-400 border border-green-800/50";
        case "PARTIALLY_PAID":return "bg-yellow-900/20 text-yellow-400 border border-yellow-800/50";
        case "PENDING":       return "bg-blue-900/20 text-blue-400 border border-blue-800/50";
        case "CANCELLED":     return "bg-red-900/20 text-red-400 border border-red-800/50";
        default:              return "bg-gray-900/20 text-gray-400 border border-gray-800/50";
      }
    } else {
      switch (status) {
        case "PAID":          return "bg-green-50 text-green-700 border border-green-200";
        case "PARTIALLY_PAID":return "bg-yellow-50 text-yellow-700 border border-yellow-200";
        case "PENDING":       return "bg-blue-50 text-blue-700 border border-blue-200";
        case "CANCELLED":     return "bg-red-50 text-red-700 border border-red-200";
        default:              return "bg-gray-50 text-gray-600 border border-gray-200";
      }
    }
  };

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

  const filteredExpenses = expenses.filter(exp => {
    if (!searchTerm) return true;
    const l = searchTerm.toLowerCase();
    return exp.expenseNumber?.toLowerCase().includes(l) ||
      exp.vendorName?.toLowerCase().includes(l) ||
      getCategoryConfig(exp.category).label.toLowerCase().includes(l);
  });

  const handleLogout = async () => {
    try {
      const r = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (r.ok) router.push("/login");
      else toast.error("Failed to logout");
    } catch { toast.error("Error logging out"); }
  };

  const clearFilters = () => { setFilters({ category: "", status: "", startDate: "", endDate: "" }); setSearchTerm(""); };

  const downloadExpensesCSV = () => {
    if (filteredExpenses.length === 0) { toast.error("No expenses data to export"); return; }
    const headers = ["Expense #","Date","Category","Vendor","Total Amount","Paid","Balance","Status"];
    const rows = filteredExpenses.map(exp => [
      exp.expenseNumber || "", new Date(exp.expenseDate).toLocaleDateString(),
      getCategoryConfig(exp.category).label, exp.vendorName || "",
      exp.grandTotal || 0, exp.amountPaid || 0, exp.balanceDue || 0, exp.status || "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })));
    link.setAttribute("download", `expenses_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast.success(`Exported ${filteredExpenses.length} expenses to CSV`);
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
                  <Receipt className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">{formatCompactCurrency(summary.total)}</span>
                </div>
                <div className="h-3 w-px bg-white/20" />
                <span className="text-white text-xs font-medium">{expenses.length} expenses</span>
                {summary.pending > 0 && (
                  <>
                    <div className="h-3 w-px bg-white/20" />
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-[#E84545]" />
                      <span className="text-[#E84545] text-xs font-medium">{summary.pending}</span>
                    </div>
                  </>
                )}
                <div className="h-3 w-px bg-white/20" />
                {isDark ? <Moon className="h-3 w-3 text-[#E84545]" /> : <Sun className="h-3 w-3 text-[#E84545]" />}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 backdrop-blur-xl border-b transition-colors duration-500"
          style={{ background: th.mobileHeaderBg, borderColor: th.mobileHeaderBorder }}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold flex items-center gap-1.5" style={{ color: th.mobileHeaderTitle }}>
                    Expenses
                    {isDark ? <Moon className="h-3.5 w-3.5 text-[#E84545]" /> : <Sun className="h-3.5 w-3.5 text-[#E84545]" />}
                  </h1>
                  <p className="text-xs" style={{ color: th.mobileHeaderSub }}>{filteredExpenses.length} records</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
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
              <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: th.mobileSearchPH }} />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search expenses..."
                className={`w-full pl-10 pr-4 py-2 rounded-xl text-sm backdrop-blur-sm border ${inputClass}`}
                style={{ background: th.mobileSearchBg, borderColor: th.mobileSearchBorder, color: th.mobileSearchText }} />
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 border-b shadow-lg transition-colors duration-500"
          style={{ background: th.desktopHeaderBg, borderColor: th.desktopHeaderBorder }}>
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Receipt className="h-8 w-8" style={{ color: th.desktopHeaderTitle }} />
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: th.desktopHeaderTitle }}>
                    Expenses Management
                    
                  </h1>
                  <p className="mt-1" style={{ color: th.desktopHeaderSub }}>Track and manage business expenses</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={downloadExpensesCSV}
                  className="flex items-center space-x-2 px-4 py-2.5 backdrop-blur-sm border rounded-lg transition-all group hover:opacity-80"
                  style={{ background: th.desktopBtnBg, borderColor: th.desktopBtnBorder, color: th.desktopBtnText }}>
                  <Download className="h-4 w-4 group-hover:scale-110 transition-transform" /><span>Export CSV</span>
                </button>
                <button onClick={() => setShowCreateModal(true)}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] border border-[#E84545]/30 text-white rounded-lg hover:opacity-90 transition-all group">
                  <Plus className="h-4 w-4 group-hover:scale-110 transition-transform" /><span>Record Expense</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[180px] md:pt-6 pb-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            {[
              { icon: Receipt, label: "Total Expenses", value: formatCompactCurrency(summary.total), valueColor: th.statValueWhite },
              { icon: DollarSign, label: "Total Paid", value: formatCompactCurrency(summary.paid), valueColor: '#4ade80' },
              { icon: TrendingDown, label: "Outstanding", value: formatCompactCurrency(summary.outstanding), valueColor: '#E84545' },
              { icon: AlertTriangle, label: "Pending", value: summary.pending, valueColor: '#E84545' },
            ].map((stat, i) => (
              <div key={i} className="rounded-2xl p-4 active:scale-[0.98] transition-all border"
                style={{ background: th.cardBg, borderColor: th.cardBorder }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = th.cardBorderHover)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = th.cardBorder)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl" style={{ background: th.statIconBg }}>
                    <stat.icon className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                  </div>
                </div>
                <p className="text-xs mb-1" style={{ color: th.statLabel }}>{stat.label}</p>
                <p className="text-lg md:text-xl font-bold truncate" style={{ color: stat.valueColor }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Pending Alert */}
          {summary.pending > 0 && (
            <div className="border-l-4 border-[#E84545] p-4 md:p-6 mb-6 rounded-xl active:scale-[0.98] transition-all"
              style={{ background: th.alertBg, borderColor: th.alertBorder }}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-[#E84545] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base md:text-lg font-semibold" style={{ color: th.alertText }}>
                    {summary.pending} pending expenses
                  </h3>
                  <p className="text-sm mt-1" style={{ color: th.alertSub }}>
                    There are unpaid expenses requiring attention. Review and process payments.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Filters */}
          <div className="hidden md:block rounded-xl shadow p-4 mb-6 border transition-colors duration-500"
            style={{ background: th.filterBg, borderColor: th.filterBorder }}>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[
                { label: 'Category', key: 'category', options: [{ value: '', label: 'All Categories' }, ...EXPENSE_CATEGORIES.map(c => ({ value: c.value, label: c.label }))] },
                { label: 'Status', key: 'status', options: [{ value: '', label: 'All Status' }, { value: 'PAID', label: 'Paid' }, { value: 'PARTIALLY_PAID', label: 'Partially Paid' }, { value: 'PENDING', label: 'Pending' }, { value: 'CANCELLED', label: 'Cancelled' }] },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium mb-2" style={{ color: th.filterLabel }}>{f.label}</label>
                  <select value={(filters as any)[f.key]} onChange={e => setFilters({ ...filters, [f.key]: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-lg ${inputClass}`} style={inputStyle}>
                    {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              ))}
              {['startDate', 'endDate'].map((key, i) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-2" style={{ color: th.filterLabel }}>{i === 0 ? 'From Date' : 'To Date'}</label>
                  <input type="date" value={(filters as any)[key]} onChange={e => setFilters({ ...filters, [key]: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-lg ${inputClass}`} style={inputStyle} />
                </div>
              ))}
              <div className="flex items-end gap-2">
                <button onClick={fetchExpenses} disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-lg border transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 hover:opacity-80"
                  style={{ background: th.inputBg, borderColor: th.inputBorder, color: th.inputText }}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
                  <span>Filter</span>
                </button>
                <button onClick={clearFilters} className="px-4 py-2.5 rounded-lg border transition-colors hover:opacity-80"
                  style={{ background: th.inputBg, borderColor: th.inputBorder, color: th.inputText }}>Clear</button>
              </div>
            </div>
          </div>

          {/* Expenses List */}
          <div className="rounded-2xl shadow-xl overflow-hidden border transition-colors duration-500"
            style={{ background: th.listPanelBg, borderColor: th.listPanelBorder }}>
            <div className="hidden md:flex px-6 py-4 border-b items-center justify-between" style={{ borderColor: th.divider }}>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: th.listTitle }}>Recent Expenses</h2>
                <p className="text-sm mt-1" style={{ color: th.listSubtitle }}>{filteredExpenses.length} records found</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: th.listSubtitle }} />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search expenses..."
                  className={`w-64 pl-10 pr-3 py-2 rounded-lg ${inputClass}`}
                  style={{ ...inputStyle, '--placeholder-color': th.listSubtitle } as any} />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#E84545]" />
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-16 w-16 mx-auto mb-4" style={{ color: th.emptyIcon }} />
                <p className="text-lg font-medium" style={{ color: th.emptyText }}>No expenses found</p>
                <button onClick={() => setShowCreateModal(true)}
                  className="mt-4 px-6 py-2.5 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:opacity-90 transition-opacity inline-flex items-center space-x-2">
                  <Plus className="w-4 h-4" /><span>Record First Expense</span>
                </button>
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="md:hidden divide-y p-4 space-y-3" style={{ borderColor: th.divider }}>
                  {filteredExpenses.map(expense => {
                    const cfg = getCategoryConfig(expense.category);
                    const CatIcon = cfg.icon;
                    return (
                      <div key={expense._id} className="rounded-xl p-4 active:scale-[0.98] transition-all border"
                        style={{ background: th.mobileItemBg, borderColor: th.mobileItemBorder }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = th.cardBorderHover)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = th.mobileItemBorder)}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <CatIcon className="h-3 w-3 text-[#E84545]" />
                              <p className="text-sm font-semibold truncate" style={{ color: th.mobileItemText }}>{expense.expenseNumber}</p>
                            </div>
                            <p className="text-xs" style={{ color: th.mobileItemLabel }}>{new Date(expense.expenseDate).toLocaleDateString()}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(expense.status)}`}>
                            {expense.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="mb-3">
                          <p className="text-sm" style={{ color: isDark ? '#e2e8f0' : '#374151' }}>{expense.vendorName || "No vendor"}</p>
                          <p className="text-xs mt-1" style={{ color: th.mobileItemLabel }}>{cfg.label}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 py-3 border-t" style={{ borderColor: th.mobileItemRowBorder }}>
                          <div>
                            <span className="text-[10px] uppercase block mb-1" style={{ color: th.mobileItemLabel }}>Total</span>
                            <p className="text-sm font-semibold" style={{ color: th.mobileItemText }}>QR {expense.grandTotal?.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase block mb-1" style={{ color: th.mobileItemLabel }}>Paid</span>
                            <p className="text-sm font-semibold text-green-400">QR {expense.amountPaid?.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase block mb-1" style={{ color: th.mobileItemLabel }}>Balance</span>
                            <p className="text-sm font-semibold text-[#E84545]">QR {expense.balanceDue?.toLocaleString()}</p>
                          </div>
                          <div className="flex items-end justify-end">
                            <Link href={`/autocityPro/expenses/${expense._id}`}>
                              <button className="p-2 rounded-lg transition-colors"
                                style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
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
                  <table className="min-w-full divide-y text-sm" style={{ borderColor: th.tableRowDivider }}>
                    <thead style={{ background: th.tableHeadBg }}>
                      <tr>
                        {['Date','Expense #','Category','Vendor','Amount','Paid','Status','Actions'].map((h, i) => (
                          <th key={h} className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider ${i >= 4 && i <= 5 ? 'text-right' : i === 6 ? 'text-center' : i === 7 ? 'text-right' : 'text-left'}`}
                            style={{ color: th.tableHeadText }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map(expense => {
                        const cfg = getCategoryConfig(expense.category);
                        const CatIcon = cfg.icon;
                        return (
                          <tr key={expense._id} className="transition-colors"
                            style={{ borderTop: `1px solid ${th.tableRowDivider}` }}
                            onMouseEnter={e => (e.currentTarget.style.background = th.tableRowHover)}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <td className="px-6 py-4" style={{ color: th.tableCellText }}>
                              {new Date(expense.expenseDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 font-medium" style={{ color: th.tableCellTextPrimary }}>
                              {expense.expenseNumber}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <div className="p-1.5 rounded" style={{ background: th.mobileBtnBg }}>
                                  <CatIcon className="w-4 h-4 text-[#E84545]" />
                                </div>
                                <span style={{ color: th.tableCellText }}>{cfg.label}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4" style={{ color: th.tableCellText }}>{expense.vendorName || "-"}</td>
                            <td className="px-6 py-4 text-right font-semibold" style={{ color: th.tableCellTextPrimary }}>
                              QR {expense.grandTotal?.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right text-green-400">
                              QR {expense.amountPaid?.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(expense.status)}`}>
                                {expense.status.replace("_", " ")}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Link href={`/autocityPro/expenses/${expense._id}`}>
                                  <button className="p-2 rounded-lg transition-colors"
                                    style={{ color: th.mobileBtnText }}
                                    onMouseEnter={e => (e.currentTarget.style.background = th.mobileBtnBg)}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    title="View Details">
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

        <div className="md:hidden h-24" />
      </div>

      {/* Mobile Filter Modal */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 backdrop-blur-sm z-50 animate-in fade-in duration-200" style={{ background: th.modalOverlay }}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom duration-300 transition-colors"
            style={{ background: th.modalBg, borderColor: th.modalBorder }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: th.modalTitle }}>Filters</h2>
              <button onClick={() => setShowFilters(false)} className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.modalCloseBg, color: th.modalCloseText }}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Category', key: 'category', options: [{ value: '', label: 'All Categories' }, ...EXPENSE_CATEGORIES.map(c => ({ value: c.value, label: c.label }))] },
                { label: 'Status', key: 'status', options: [{ value: '', label: 'All Status' }, { value: 'PAID', label: 'Paid' }, { value: 'PARTIALLY_PAID', label: 'Partially Paid' }, { value: 'PENDING', label: 'Pending' }, { value: 'CANCELLED', label: 'Cancelled' }] },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium mb-2" style={{ color: isDark ? '#d1d5db' : '#374151' }}>{f.label}</label>
                  <select value={(filters as any)[f.key]} onChange={e => setFilters({ ...filters, [f.key]: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg" style={inputStyle}>
                    {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              ))}
              {['startDate', 'endDate'].map((key, i) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-2" style={{ color: isDark ? '#d1d5db' : '#374151' }}>{i === 0 ? 'From Date' : 'To Date'}</label>
                  <input type="date" value={(filters as any)[key]} onChange={e => setFilters({ ...filters, [key]: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg" style={inputStyle} />
                </div>
              ))}
              <div className="flex gap-3 pt-4">
                <button onClick={() => { clearFilters(); setShowFilters(false); }}
                  className="flex-1 px-4 py-3 rounded-lg transition-colors active:scale-95 border"
                  style={{ background: th.modalItemBg, borderColor: th.modalItemBorder, color: th.modalItemText }}>Clear</button>
                <button onClick={() => { fetchExpenses(); setShowFilters(false); }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-lg text-white font-semibold active:scale-95 transition-all">Apply</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Action Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 backdrop-blur-sm z-50 animate-in fade-in duration-200" style={{ background: th.modalOverlay }}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom duration-300"
            style={{ background: th.modalBg, borderColor: th.modalBorder }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: th.modalTitle }}>Actions</h2>
              <button onClick={() => setShowMobileMenu(false)} className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.modalCloseBg, color: th.modalCloseText }}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Record Expense', icon: Plus, onClick: () => { setShowCreateModal(true); setShowMobileMenu(false); } },
                { label: 'Export CSV', icon: Download, onClick: () => { downloadExpensesCSV(); setShowMobileMenu(false); } },
                { label: 'Refresh Data', icon: RefreshCw, onClick: () => { fetchExpenses(); setShowMobileMenu(false); toast.success('Expenses data refreshed'); } },
              ].map(action => (
                <button key={action.label} onClick={action.onClick}
                  className="w-full p-4 rounded-xl font-semibold transition-all flex items-center justify-between active:scale-95 border"
                  style={{ background: th.modalItemBg, borderColor: th.modalItemBorder, color: th.modalItemText }}>
                  <span>{action.label}</span><action.icon className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCreateModal && <CreateExpenseForm onClose={() => setShowCreateModal(false)} onSuccess={fetchExpenses} />}
    </MainLayout>
  );
}