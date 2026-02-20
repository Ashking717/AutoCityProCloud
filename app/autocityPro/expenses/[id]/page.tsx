// Expense Detail Page - expense/[id]/page.tsx - WITH TIME-BASED LIGHT/DARK THEME
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Calendar, User, CreditCard, FileText, Tag, Receipt,
  CheckCircle, XCircle, Clock, DollarSign, Building, Phone, Mail,
  Edit, Trash2, RotateCcw, ChevronLeft, MoreVertical, X, Download,
  AlertTriangle, TrendingDown, RefreshCw, ArrowUpRight, Printer, Share2, Sun, Moon,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import MainLayout from "@/components/layout/MainLayout";

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

interface ExpenseItem { description: string; accountId: string; accountName: string; accountCode: string; amount: number; notes?: string; }
interface Expense {
  _id: string; expenseNumber: string; expenseDate: string; category: string;
  items: ExpenseItem[]; subtotal: number; taxAmount: number; grandTotal: number;
  paymentMethod: string; paymentAccount?: { _id: string; code: string; name: string; };
  amountPaid: number; balanceDue: number; vendorName?: string; vendorPhone?: string;
  vendorEmail?: string; referenceNumber?: string; notes?: string; status: string;
  isPostedToGL: boolean; voucherId?: string;
  createdBy: { name?: string; email?: string; username?: string; };
  approvedBy?: { name?: string; email?: string; username?: string; };
  approvedAt?: string; createdAt: string;
}
interface Voucher { voucherNumber: string; voucherType: string; date: string; narration: string; entries: Array<{ accountNumber: string; accountName: string; debit: number; credit: number; }>; totalDebit: number; totalCredit: number; }
interface LedgerEntry { accountNumber: string; accountName: string; debit: number; credit: number; narration: string; date: string; }

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const expenseId = params.id as string;
  const isDark = useTimeBasedTheme();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    pageBg:           isDark ? '#050505'                                                    : '#f3f4f6',
    // Header
    desktopHeaderBg:  isDark ? 'linear-gradient(135deg,#932222,#411010,#a20c0c)'           : 'linear-gradient(135deg,#fef2f2,#fee2e2,#fecaca)',
    desktopHeaderBorder: isDark ? 'rgba(255,255,255,0.05)'                                 : 'rgba(0,0,0,0.08)',
    headerTitle:      isDark ? '#ffffff'                                                    : '#7f1d1d',
    headerSub:        isDark ? 'rgba(255,255,255,0.80)'                                    : '#991b1b',
    headerBackText:   isDark ? 'rgba(255,255,255,0.80)'                                    : '#991b1b',
    headerIconBg:     isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(127,29,29,0.10)',
    // Mobile header
    mobileHeaderBg:   isDark ? 'linear-gradient(135deg,#0A0A0A,#050505,#0A0A0A)'          : 'linear-gradient(135deg,#ffffff,#f9fafb,#ffffff)',
    mobileHeaderBorder: isDark ? 'rgba(255,255,255,0.05)'                                  : 'rgba(0,0,0,0.08)',
    mobileHeaderTitle: isDark ? '#ffffff'                                                   : '#111827',
    mobileHeaderSub:  isDark ? 'rgba(255,255,255,0.60)'                                    : '#6b7280',
    mobileStatLabel:  isDark ? 'rgba(255,255,255,0.60)'                                    : '#6b7280',
    mobileStatBorder: isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
    mobileBtnBg:      isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.05)',
    mobileBtnText:    isDark ? 'rgba(255,255,255,0.80)'                                    : '#374151',
    // Cards
    cardBg:           isDark ? 'linear-gradient(135deg,#0A0A0A,#050505)'                   : 'linear-gradient(135deg,#ffffff,#f9fafb)',
    cardBorder:       isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
    cardBorderHover:  isDark ? 'rgba(232,69,69,0.30)'                                      : 'rgba(232,69,69,0.25)',
    cardTitle:        isDark ? '#ffffff'                                                    : '#111827',
    // Inner items
    itemBg:           isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.04)',
    itemBorder:       isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
    // Stat cards
    statIconBg:       isDark ? 'rgba(232,69,69,0.10)'                                      : 'rgba(232,69,69,0.08)',
    statLabel:        isDark ? '#94a3b8'                                                    : '#6b7280',
    statValueDefault: isDark ? '#ffffff'                                                    : '#111827',
    statValueSecondary: isDark ? '#cbd5e1'                                                  : '#374151',
    // Alert
    alertBg:          isDark ? 'rgba(232,69,69,0.10)'                                      : 'rgba(254,202,202,0.50)',
    alertBorder:      isDark ? 'rgba(232,69,69,0.20)'                                      : 'rgba(220,38,38,0.20)',
    alertTitle:       isDark ? '#ffffff'                                                    : '#7f1d1d',
    alertSub:         isDark ? '#cbd5e1'                                                    : '#991b1b',
    // Text
    textPrimary:      isDark ? '#ffffff'                                                    : '#111827',
    textSecondary:    isDark ? '#94a3b8'                                                    : '#6b7280',
    textMuted:        isDark ? '#475569'                                                    : '#9ca3af',
    // Table
    tableHeadBorder:  isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
    tableRowBorder:   isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.05)',
    tableTotalBg:     isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.04)',
    // Voucher banner
    voucherBg:        isDark ? 'rgba(232,69,69,0.10)'                                      : 'rgba(254,202,202,0.30)',
    voucherBorder:    isDark ? 'rgba(232,69,69,0.20)'                                      : 'rgba(220,38,38,0.20)',
    voucherText:      isDark ? '#E84545'                                                    : '#b91c1c',
    voucherSub:       isDark ? '#cbd5e1'                                                    : '#374151',
    // Actions panel
    actionsBorder:    isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
    actionBtnBg:      isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.05)',
    actionBtnBorder:  isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
    actionBtnText:    isDark ? '#ffffff'                                                    : '#374151',
    // Dividers
    divider:          isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
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
  };

  useEffect(() => {
    fetchExpenseDetails();
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [expenseId]);

  const fetchExpenseDetails = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/expenses/${expenseId}`, { credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        setExpense(data.expense); setVoucher(data.voucher); setLedgerEntries(data.ledgerEntries || []);
      } else { toast.error("Failed to fetch expense details"); router.push("/autocityPro/expenses"); }
    } catch { toast.error("Failed to fetch expense details"); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this expense? This action cannot be undone.")) return;
    setActionLoading(true);
    try {
      const r = await fetch(`/api/expenses/${expenseId}`, { method: "DELETE", credentials: "include" });
      if (r.ok) { toast.success("Expense deleted successfully"); router.push("/autocityPro/expenses"); }
      else toast.error((await r.json()).error || "Failed to delete expense");
    } catch { toast.error("Failed to delete expense"); }
    finally { setActionLoading(false); }
  };

  const handleAction = async (action: string) => {
    setActionLoading(true);
    try {
      const r = await fetch(`/api/expenses/${expenseId}/actions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ action }),
      });
      if (r.ok) { toast.success(`Expense ${action}ed successfully`); fetchExpenseDetails(); }
      else toast.error((await r.json()).error || `Failed to ${action} expense`);
    } catch { toast.error(`Failed to ${action} expense`); }
    finally { setActionLoading(false); }
  };

  const handleLogout = async () => {
    if (!confirm("Are you sure you want to logout?")) return;
    try {
      const r = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (r.ok) { toast.success("Logged out successfully"); router.push("/autocityPro/login"); }
      else toast.error((await r.json()).error || "Failed to logout");
    } catch { toast.error("Failed to logout"); }
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) return `QR${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 10000) return `QR${(amount / 1000).toFixed(1)}K`;
    return `QR${amount.toFixed(0)}`;
  };

  const printExpense = () => { window.print(); toast.success("Printing expense..."); };
  const shareExpense = async () => {
    if (navigator.share && expense) {
      try { await navigator.share({ title: `Expense: ${expense.expenseNumber}`, text: `Expense ${expense.expenseNumber} - ${expense.grandTotal} QAR`, url: window.location.href }); toast.success("Expense shared successfully"); }
      catch { toast.error("Failed to share expense"); }
    } else { navigator.clipboard.writeText(window.location.href); toast.success("Link copied to clipboard"); }
  };

  const getCategoryLabel = (category: string) => {
    const m: Record<string, string> = { UTILITY:"Utility Bills", RENT:"Rent", SALARY:"Salaries & Wages", MAINTENANCE:"Maintenance", MARKETING:"Marketing", OFFICE_SUPPLIES:"Office Supplies", TRANSPORTATION:"Transportation", PROFESSIONAL_FEES:"Professional Fees", OTHER:"Other Expenses" };
    return m[category] || category;
  };

  const getStatusBadge = (status: string) => {
    type BadgeKey = 'PAID'|'PENDING'|'PARTIALLY_PAID'|'CANCELLED'|'DRAFT';
    const badges: Record<BadgeKey, { darkClass: string; lightClass: string; icon: any }> = {
      PAID:         { darkClass: "bg-green-900/20 text-green-400 border-green-800/50", lightClass: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle },
      PENDING:      { darkClass: "bg-yellow-900/20 text-yellow-400 border-yellow-800/50", lightClass: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: Clock },
      PARTIALLY_PAID: { darkClass: "bg-blue-900/20 text-blue-400 border-blue-800/50", lightClass: "bg-blue-50 text-blue-700 border-blue-200", icon: DollarSign },
      CANCELLED:    { darkClass: "bg-red-900/20 text-red-400 border-red-800/50", lightClass: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
      DRAFT:        { darkClass: "bg-slate-900/20 text-slate-400 border-slate-800/50", lightClass: "bg-gray-50 text-gray-600 border-gray-200", icon: FileText },
    };
    const badge = badges[status as BadgeKey] || badges.DRAFT;
    const Icon = badge.icon;
    const cls = isDark ? badge.darkClass : badge.lightClass;
    return (
      <span className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${cls}`}>
        <Icon className="w-3 h-3" /><span>{status.replace("_", " ")}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <MainLayout user={null} onLogout={handleLogout}>
        <div className="min-h-screen flex items-center justify-center transition-colors duration-500" style={{ background: th.pageBg }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E84545] mx-auto mb-4" />
            <p style={{ color: th.textSecondary }}>Loading expense details...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!expense) {
    return (
      <MainLayout user={null} onLogout={handleLogout}>
        <div className="min-h-screen flex items-center justify-center transition-colors duration-500" style={{ background: th.pageBg }}>
          <div className="text-center">
            <XCircle className="w-16 h-16 text-[#E84545] mx-auto mb-4" />
            <p className="text-lg mb-4" style={{ color: th.textSecondary }}>Expense not found</p>
            <Link href="/autocityPro/expenses">
              <button className="px-6 py-2.5 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:opacity-90 transition-opacity inline-flex items-center space-x-2">
                <ArrowLeft className="w-4 h-4" /><span>Back to Expenses</span>
              </button>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout user={null} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <Receipt className="h-3 w-3 text-[#E84545]" />
                <span className="text-white text-xs font-semibold">{expense.expenseNumber}</span>
                <div className="h-3 w-px bg-white/20" />
                <span className="text-white text-xs font-medium">{formatCompactCurrency(expense.grandTotal)}</span>
                <div className="h-3 w-px bg-white/20" />
                {getStatusBadge(expense.status)}
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
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-bold truncate flex items-center gap-1.5" style={{ color: th.mobileHeaderTitle }}>
                    Expense #{expense.expenseNumber}
                    {isDark ? <Moon className="h-3.5 w-3.5 text-[#E84545]" /> : <Sun className="h-3.5 w-3.5 text-[#E84545]" />}
                  </h1>
                  <p className="text-xs truncate" style={{ color: th.mobileHeaderSub }}>
                    {new Date(expense.expenseDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowMobileMenu(true)} className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: th.mobileStatBorder }}>
              {[
                { label: 'Total', value: `QR ${expense.grandTotal.toLocaleString()}`, color: th.mobileHeaderTitle },
                { label: 'Paid', value: `QR ${expense.amountPaid.toLocaleString()}`, color: '#4ade80' },
                { label: 'Balance', value: `QR ${expense.balanceDue.toLocaleString()}`, color: '#E84545' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-xs mb-1" style={{ color: th.mobileStatLabel }}>{s.label}</p>
                  <p className="text-sm font-semibold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 border-b shadow-lg transition-colors duration-500"
          style={{ background: th.desktopHeaderBg, borderColor: th.desktopHeaderBorder }}>
          <div className="px-8">
            <div className="flex justify-between items-center">
              <button onClick={() => router.push("/autocityPro/expenses")}
                className="flex items-center space-x-2 transition-colors p-2 rounded-xl hover:opacity-70"
                style={{ color: th.headerBackText }}>
                <ArrowLeft className="w-5 h-5" /><span>Back to Expenses</span>
              </button>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <h1 className="text-2xl font-bold flex items-center gap-2 justify-end" style={{ color: th.headerTitle }}>
                    Expense #{expense.expenseNumber}
                    {isDark ? <Moon className="h-4 w-4 text-[#E84545]" /> : <Sun className="h-4 w-4 text-[#E84545]" />}
                  </h1>
                  <p style={{ color: th.headerSub }}>
                    {new Date(expense.expenseDate).toLocaleDateString()} • {getCategoryLabel(expense.category)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {[{ icon: Printer, onClick: printExpense, title: 'Print' }, { icon: Share2, onClick: shareExpense, title: 'Share' }].map(btn => (
                    <button key={btn.title} onClick={btn.onClick} title={btn.title}
                      className="p-2 rounded-xl transition-colors"
                      style={{ background: th.headerIconBg, color: th.headerTitle }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                      <btn.icon className="h-5 w-5" />
                    </button>
                  ))}
                  {getStatusBadge(expense.status)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[180px] md:pt-6 pb-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            {[
              { icon: Receipt, label: "Total Amount", value: formatCompactCurrency(expense.grandTotal), sub: `QR ${expense.grandTotal.toLocaleString()}`, color: th.statValueDefault },
              { icon: DollarSign, label: "Amount Paid", value: formatCompactCurrency(expense.amountPaid), sub: null, color: '#4ade80' },
              { icon: TrendingDown, label: "Balance Due", value: formatCompactCurrency(expense.balanceDue), sub: null, color: '#E84545' },
              { icon: Tag, label: "Category", value: getCategoryLabel(expense.category), sub: null, color: th.statValueSecondary },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl p-4 active:scale-[0.98] transition-all border"
                style={{ background: th.cardBg, borderColor: th.cardBorder }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = th.cardBorderHover)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = th.cardBorder)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl" style={{ background: th.statIconBg }}>
                    <stat.icon className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                  </div>
                </div>
                <p className="text-xs mb-1" style={{ color: th.statLabel }}>{stat.label}</p>
                <p className="text-lg md:text-xl font-bold truncate" style={{ color: stat.color }}>{stat.value}</p>
                {stat.sub && <p className="text-xs mt-1" style={{ color: th.textMuted }}>{stat.sub}</p>}
              </div>
            ))}
          </div>

          {/* Pending Balance Alert */}
          {expense.balanceDue > 0 && (
            <div className="border-l-4 border-[#E84545] p-4 md:p-6 mb-6 rounded-xl active:scale-[0.98] transition-all"
              style={{ background: th.alertBg, borderColor: th.alertBorder }}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-[#E84545] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base md:text-lg font-semibold" style={{ color: th.alertTitle }}>
                    Outstanding Balance: QR {expense.balanceDue.toLocaleString()}
                  </h3>
                  <p className="text-sm mt-1" style={{ color: th.alertSub }}>
                    This expense has an unpaid balance. Consider processing payment.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">

              {/* Items - Mobile */}
              <div className="md:hidden rounded-2xl p-4 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: th.cardTitle }}>Expense Items</h2>
                <div className="space-y-3">
                  {expense.items.map((item) => (
                    <div key={`${item.accountCode}-${item.description}`} className="rounded-xl p-4 active:scale-[0.98] transition-all border"
                      style={{ background: th.itemBg, borderColor: th.itemBorder }}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: th.textPrimary }}>{item.description}</p>
                          <p className="text-xs mt-1" style={{ color: th.textSecondary }}>{item.accountCode} - {item.accountName}</p>
                        </div>
                        <p className="text-sm font-semibold text-[#E84545] ml-2">QR {item.amount.toLocaleString()}</p>
                      </div>
                      {item.notes && <p className="text-xs italic mt-2" style={{ color: th.textMuted }}>{item.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Items - Desktop */}
              <div className="hidden md:block rounded-2xl p-6 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2" style={{ color: th.cardTitle }}>
                  <Receipt className="w-5 h-5 text-[#E84545]" /><span>Expense Items</span>
                </h2>
                <div className="space-y-3">
                  {expense.items.map((item) => (
                    <div key={`${item.accountCode}-${item.description}`} className="rounded-xl p-4 border transition-colors"
                      style={{ background: th.itemBg, borderColor: th.itemBorder }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = th.cardBorderHover)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = th.itemBorder)}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium" style={{ color: th.textPrimary }}>{item.description}</p>
                          <p className="text-sm mt-1" style={{ color: th.textSecondary }}>{item.accountCode} - {item.accountName}</p>
                          {item.notes && <p className="text-sm italic mt-2" style={{ color: th.textMuted }}>{item.notes}</p>}
                        </div>
                        <p className="text-lg font-semibold text-[#E84545]">QR {item.amount.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accounting Entries */}
              {expense.isPostedToGL && voucher && (
                <div className="rounded-2xl p-4 md:p-6 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                  <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2" style={{ color: th.cardTitle }}>
                    <FileText className="w-5 h-5 text-[#E84545]" /><span>Accounting Entries</span>
                  </h2>
                  <div className="mb-4 p-3 rounded-lg border" style={{ background: th.voucherBg, borderColor: th.voucherBorder }}>
                    <p className="text-sm" style={{ color: th.voucherText }}>
                      <span className="font-semibold">Voucher:</span> {voucher.voucherNumber}
                    </p>
                    <p className="text-xs mt-1" style={{ color: th.voucherSub }}>{voucher.narration}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${th.tableHeadBorder}` }}>
                          {['Account','Debit','Credit'].map((h, i) => (
                            <th key={h} className={`py-2 px-3 text-sm font-medium ${i === 0 ? 'text-left' : 'text-right'}`}
                              style={{ color: th.textSecondary }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerEntries.map((entry) => (
                          <tr key={`${entry.accountNumber}-${entry.debit}-${entry.credit}`} style={{ borderBottom: `1px solid ${th.tableRowBorder}` }}>
                            <td className="py-3 px-3">
                              <p className="text-sm font-medium" style={{ color: th.textPrimary }}>{entry.accountNumber}</p>
                              <p className="text-xs" style={{ color: th.textSecondary }}>{entry.accountName}</p>
                            </td>
                            <td className="py-3 px-3 text-right text-sm" style={{ color: th.textPrimary }}>
                              {entry.debit > 0 ? `QR ${entry.debit.toLocaleString()}` : "-"}
                            </td>
                            <td className="py-3 px-3 text-right text-sm" style={{ color: th.textPrimary }}>
                              {entry.credit > 0 ? `QR ${entry.credit.toLocaleString()}` : "-"}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ background: th.tableTotalBg }}>
                          <td className="py-3 px-3 text-sm font-semibold" style={{ color: th.textSecondary }}>Total</td>
                          <td className="py-3 px-3 text-right text-sm text-[#E84545]">QR {voucher.totalDebit.toLocaleString()}</td>
                          <td className="py-3 px-3 text-right text-sm text-[#E84545]">QR {voucher.totalCredit.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Payment Info */}
              <div className="rounded-2xl p-4 md:p-6 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2" style={{ color: th.cardTitle }}>
                  <CreditCard className="w-5 h-5 text-[#E84545]" /><span>Payment Info</span>
                </h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="mb-1" style={{ color: th.textSecondary }}>Payment Method</p>
                    <p className="font-medium" style={{ color: th.textPrimary }}>{expense.paymentMethod.replace("_", " ")}</p>
                  </div>
                  {expense.paymentAccount && (
                    <div>
                      <p className="mb-1" style={{ color: th.textSecondary }}>Payment Account</p>
                      <p className="font-medium" style={{ color: th.textPrimary }}>{expense.paymentAccount.code} - {expense.paymentAccount.name}</p>
                    </div>
                  )}
                  {expense.referenceNumber && (
                    <div>
                      <p className="mb-1" style={{ color: th.textSecondary }}>Reference Number</p>
                      <p className="font-medium" style={{ color: th.textPrimary }}>{expense.referenceNumber}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Vendor Info */}
              {expense.vendorName && (
                <div className="rounded-2xl p-4 md:p-6 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                  <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2" style={{ color: th.cardTitle }}>
                    <Building className="w-5 h-5 text-[#E84545]" /><span>Vendor Info</span>
                  </h2>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="mb-1" style={{ color: th.textSecondary }}>Vendor Name</p>
                      <p className="font-medium" style={{ color: th.textPrimary }}>{expense.vendorName}</p>
                    </div>
                    {expense.vendorPhone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4" style={{ color: th.textSecondary }} />
                        <p style={{ color: th.textPrimary }}>{expense.vendorPhone}</p>
                      </div>
                    )}
                    {expense.vendorEmail && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4" style={{ color: th.textSecondary }} />
                        <p style={{ color: th.textPrimary }}>{expense.vendorEmail}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Audit Info */}
              <div className="rounded-2xl p-4 md:p-6 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2" style={{ color: th.cardTitle }}>
                  <User className="w-5 h-5 text-[#E84545]" /><span>Audit Info</span>
                </h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="mb-1" style={{ color: th.textSecondary }}>Created By</p>
                    <p className="font-medium" style={{ color: th.textPrimary }}>{expense.createdBy.name || expense.createdBy.username || expense.createdBy.email}</p>
                    <p className="text-xs mt-1" style={{ color: th.textMuted }}>{new Date(expense.createdAt).toLocaleString()}</p>
                  </div>
                  {expense.approvedBy && (
                    <div>
                      <p className="mb-1" style={{ color: th.textSecondary }}>Approved By</p>
                      <p className="font-medium" style={{ color: th.textPrimary }}>{expense.approvedBy.name || expense.approvedBy.username || expense.approvedBy.email}</p>
                      {expense.approvedAt && <p className="text-xs mt-1" style={{ color: th.textMuted }}>{new Date(expense.approvedAt).toLocaleString()}</p>}
                    </div>
                  )}
                  <div>
                    <p className="mb-1" style={{ color: th.textSecondary }}>GL Status</p>
                    {expense.isPostedToGL
                      ? <span className="text-green-400">✓ Posted to Ledger</span>
                      : <span className="text-yellow-400">⚠ Not Posted</span>}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {expense.notes && (
                <div className="rounded-2xl p-4 md:p-6 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                  <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2" style={{ color: th.cardTitle }}>
                    <FileText className="w-5 h-5 text-[#E84545]" /><span>Notes</span>
                  </h2>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: th.textSecondary }}>{expense.notes}</p>
                </div>
              )}

              {/* Actions - Desktop */}
              <div className="hidden md:block rounded-2xl p-6 border transition-colors duration-500" style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: th.cardTitle }}>Actions</h2>
                <div className="space-y-3">
                  {expense.status === "DRAFT" && !expense.isPostedToGL && (
                    <button onClick={() => router.push(`/autocityPro/expenses/${expenseId}/edit`)} disabled={actionLoading}
                      className="w-full px-4 py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 border hover:opacity-70"
                      style={{ background: th.actionBtnBg, borderColor: th.actionBtnBorder, color: th.actionBtnText }}>
                      <Edit className="w-4 h-4" /><span>Edit Expense</span>
                    </button>
                  )}
                  {expense.status === "PENDING" && (
                    <button onClick={() => handleAction("pay")} disabled={actionLoading}
                      className="w-full px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center space-x-2">
                      <DollarSign className="w-4 h-4" /><span>Pay Now</span>
                    </button>
                  )}
                  {expense.status !== "CANCELLED" && (
                    <button onClick={handleDelete} disabled={actionLoading}
                      className="w-full px-4 py-3 bg-red-900/20 border border-red-800/50 text-red-400 rounded-lg hover:bg-red-900/30 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2">
                      <Trash2 className="w-4 h-4" /><span>Delete Expense</span>
                    </button>
                  )}
                  <button onClick={fetchExpenseDetails} disabled={actionLoading}
                    className="w-full px-4 py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 border hover:opacity-70"
                    style={{ background: th.actionBtnBg, borderColor: th.actionBtnBorder, color: th.actionBtnText }}>
                    <RefreshCw className="w-4 h-4" /><span>Refresh Data</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="md:hidden h-24" />
      </div>

      {/* Mobile Action Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 backdrop-blur-sm z-50 animate-in fade-in duration-200" style={{ background: th.modalOverlay }}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom duration-300 transition-colors"
            style={{ background: th.modalBg, borderColor: th.modalBorder }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: th.modalTitle }}>Actions</h2>
              <button onClick={() => setShowMobileMenu(false)} className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.modalCloseBg, color: th.modalCloseText }}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              {expense.status === "DRAFT" && !expense.isPostedToGL && (
                <button onClick={() => { router.push(`/autocityPro/expenses/${expenseId}/edit`); setShowMobileMenu(false); }}
                  className="w-full p-4 rounded-xl font-semibold flex items-center justify-between active:scale-95 transition-all border"
                  style={{ background: th.modalItemBg, borderColor: th.modalItemBorder, color: th.modalItemText }}>
                  <span>Edit Expense</span><Edit className="h-5 w-5" />
                </button>
              )}
              {expense.status === "PENDING" && (
                <button onClick={() => { handleAction("pay"); setShowMobileMenu(false); }}
                  className="w-full p-4 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-xl text-white font-semibold hover:opacity-90 flex items-center justify-between active:scale-95 transition-all">
                  <span>Pay Now</span><DollarSign className="h-5 w-5" />
                </button>
              )}
              {expense.status !== "CANCELLED" && (
                <button onClick={() => { handleDelete(); setShowMobileMenu(false); }}
                  className="w-full p-4 bg-red-900/20 border border-red-800/50 rounded-xl text-red-400 font-semibold hover:bg-red-900/30 flex items-center justify-between active:scale-95 transition-all">
                  <span>Delete Expense</span><Trash2 className="h-5 w-5" />
                </button>
              )}
              {[
                { label: 'Print', icon: Printer, onClick: () => { printExpense(); setShowMobileMenu(false); } },
                { label: 'Share', icon: Share2, onClick: () => { shareExpense(); setShowMobileMenu(false); } },
                { label: 'Refresh Data', icon: RefreshCw, onClick: () => { fetchExpenseDetails(); setShowMobileMenu(false); toast.success('Expense data refreshed'); } },
              ].map(action => (
                <button key={action.label} onClick={action.onClick}
                  className="w-full p-4 rounded-xl font-semibold flex items-center justify-between active:scale-95 transition-all border"
                  style={{ background: th.modalItemBg, borderColor: th.modalItemBorder, color: th.modalItemText }}>
                  <span>{action.label}</span><action.icon className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}