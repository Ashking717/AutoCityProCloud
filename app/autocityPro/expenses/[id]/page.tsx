// Expense Detail Page - expense/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  User,
  CreditCard,
  FileText,
  Tag,
  Receipt,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Building,
  Phone,
  Mail,
  Hash,
  Edit,
  Trash2,
  RotateCcw,
  ChevronLeft,
  MoreVertical,
  X,
  Download,
  AlertTriangle,
  TrendingDown,
  RefreshCw,
  ArrowUpRight,
  Printer,
  Share2,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import MainLayout from "@/components/layout/MainLayout";

interface ExpenseItem {
  description: string;
  accountId: string;
  accountName: string;
  accountCode: string;
  amount: number;
  notes?: string;
}

interface Expense {
  _id: string;
  expenseNumber: string;
  expenseDate: string;
  category: string;
  items: ExpenseItem[];
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: string;
  paymentAccount?: {
    _id: string;
    code: string;
    name: string;
  };
  amountPaid: number;
  balanceDue: number;
  vendorName?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  referenceNumber?: string;
  notes?: string;
  status: string;
  isPostedToGL: boolean;
  voucherId?: string;
  createdBy: {
    name?: string;
    email?: string;
    username?: string;
  };
  approvedBy?: {
    name?: string;
    email?: string;
    username?: string;
  };
  approvedAt?: string;
  createdAt: string;
}

interface Voucher {
  voucherNumber: string;
  voucherType: string;
  date: string;
  narration: string;
  entries: Array<{
    accountNumber: string;
    accountName: string;
    debit: number;
    credit: number;
  }>;
  totalDebit: number;
  totalCredit: number;
}

interface LedgerEntry {
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
  narration: string;
  date: string;
}

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const expenseId = params.id as string;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);

  useEffect(() => {
    fetchExpenseDetails();

    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => window.removeEventListener("resize", checkIfMobile);
  }, [expenseId]);

  const fetchExpenseDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setExpense(data.expense);
        setVoucher(data.voucher);
        setLedgerEntries(data.ledgerEntries || []);
      } else {
        toast.error("Failed to fetch expense details");
        router.push("/autocityPro/expenses");
      }
    } catch (error) {
      console.error("Error fetching expense:", error);
      toast.error("Failed to fetch expense details");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this expense? This action cannot be undone."
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Expense deleted successfully");
        router.push("/autocityPro/expenses");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete expense");
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/expenses/${expenseId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        toast.success(`Expense ${action}ed successfully`);
        fetchExpenseDetails();
      } else {
        const data = await res.json();
        toast.error(data.error || `Failed to ${action} expense`);
      }
    } catch (error) {
      console.error(`Error ${action}ing expense:`, error);
      toast.error(`Failed to ${action} expense`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = confirm("Are you sure you want to logout?");
    if (!confirmed) return;

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Logged out successfully");
        router.push("/autocityPro/login");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to logout");
      }
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to logout");
    }
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) return `QR${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 10000) return `QR${(amount / 1000).toFixed(1)}K`;
    return `QR${amount.toFixed(0)}`;
  };

  const printExpense = () => {
    window.print();
    toast.success("Printing expense...");
  };

  const shareExpense = async () => {
    if (navigator.share && expense) {
      try {
        await navigator.share({
          title: `Expense: ${expense.expenseNumber}`,
          text: `Expense ${expense.expenseNumber} - ${expense.grandTotal} QAR`,
          url: window.location.href,
        });
        toast.success("Expense shared successfully");
      } catch (error) {
        toast.error("Failed to share expense");
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  if (loading) {
    return (
      <MainLayout user={null} onLogout={handleLogout}>
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E84545] mx-auto mb-4"></div>
            <p className="text-slate-300">Loading expense details...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!expense) {
    return (
      <MainLayout user={null} onLogout={handleLogout}>
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <div className="text-center">
            <XCircle className="w-16 h-16 text-[#E84545] mx-auto mb-4" />
            <p className="text-slate-300 text-lg mb-4">Expense not found</p>
            <Link href={`/autocityPro/expenses`}>
              <button className="px-6 py-2.5 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:opacity-90 transition-opacity inline-flex items-center space-x-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Expenses</span>
              </button>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      PAID: {
        bg: "bg-green-900/20",
        text: "text-green-400",
        border: "border-green-800/50",
        icon: CheckCircle,
      },
      PENDING: {
        bg: "bg-yellow-900/20",
        text: "text-yellow-400",
        border: "border-yellow-800/50",
        icon: Clock,
      },
      PARTIALLY_PAID: {
        bg: "bg-blue-900/20",
        text: "text-blue-400",
        border: "border-blue-800/50",
        icon: DollarSign,
      },
      CANCELLED: {
        bg: "bg-red-900/20",
        text: "text-red-400",
        border: "border-red-800/50",
        icon: XCircle,
      },
      DRAFT: {
        bg: "bg-slate-900/20",
        text: "text-slate-400",
        border: "border-slate-800/50",
        icon: FileText,
      },
    };

    const badge = badges[status as keyof typeof badges] || badges.DRAFT;
    const Icon = badge.icon;

    return (
      <span
        className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border} text-xs font-semibold`}
      >
        <Icon className="w-3 h-3" />
        <span>{status.replace("_", " ")}</span>
      </span>
    );
  };

  const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
      UTILITY: "Utility Bills",
      RENT: "Rent",
      SALARY: "Salaries & Wages",
      MAINTENANCE: "Maintenance",
      MARKETING: "Marketing",
      OFFICE_SUPPLIES: "Office Supplies",
      TRANSPORTATION: "Transportation",
      PROFESSIONAL_FEES: "Professional Fees",
      OTHER: "Other Expenses",
    };
    return categories[category] || category;
  };

  return (
    <MainLayout user={null} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && expense && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">
                    {expense.expenseNumber}
                  </span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-xs font-medium">
                    {formatCompactCurrency(expense.grandTotal)}
                  </span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1">
                  {getStatusBadge(expense.status)}
                </div>
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
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-bold text-white truncate">
                    Expense #{expense.expenseNumber}
                  </h1>
                  <p className="text-xs text-white/60 truncate">
                    {new Date(expense.expenseDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMobileMenu(true)}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {/* Quick Stats - Mobile */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <div>
                <p className="text-xs text-white/60 mb-1">Total</p>
                <p className="text-sm font-semibold text-white">
                  QR {expense.grandTotal.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/60 mb-1">Paid</p>
                <p className="text-sm font-semibold text-green-400">
                  QR {expense.amountPaid.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/60 mb-1">Balance</p>
                <p className="text-sm font-semibold text-[#E84545]">
                  QR {expense.balanceDue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg">
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push("/autocityPro/expenses")}
                  className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/10"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to Expenses</span>
                </button>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <h1 className="text-2xl font-bold text-white">
                    Expense #{expense.expenseNumber}
                  </h1>
                  <p className="text-white/80">
                    {new Date(expense.expenseDate).toLocaleDateString()} • {getCategoryLabel(expense.category)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={printExpense}
                    className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                    title="Print"
                  >
                    <Printer className="h-5 w-5" />
                  </button>
                  <button
                    onClick={shareExpense}
                    className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                    title="Share"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                  {getStatusBadge(expense.status)}
                </div>
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
              <p className="text-xs text-slate-400 mb-1">Total Amount</p>
              <p className="text-lg md:text-xl font-bold text-white truncate">
                {formatCompactCurrency(expense.grandTotal)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                QR {expense.grandTotal.toLocaleString()}
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Amount Paid</p>
              <p className="text-lg md:text-xl font-bold text-green-400 truncate">
                {formatCompactCurrency(expense.amountPaid)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Balance Due</p>
              <p className="text-lg md:text-xl font-bold text-[#E84545] truncate">
                {formatCompactCurrency(expense.balanceDue)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 hover:border-[#E84545]/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-[#E84545]/10 rounded-xl">
                  <Tag className="h-4 w-4 md:h-5 md:w-5 text-[#E84545]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Category</p>
              <p className="text-lg md:text-xl font-bold text-slate-300 truncate">
                {getCategoryLabel(expense.category)}
              </p>
            </div>
          </div>

          {/* Pending Balance Alert */}
          {expense.balanceDue > 0 && (
            <div className="bg-[#E84545]/10 border-l-4 border-[#E84545] p-4 md:p-6 mb-6 rounded-xl border border-[#E84545]/20 active:scale-[0.98] transition-all">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-[#E84545] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-white">
                    Outstanding Balance: QR {expense.balanceDue.toLocaleString()}
                  </h3>
                  <p className="text-sm text-slate-300 mt-1">
                    This expense has an unpaid balance. Consider processing payment.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Expense Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Expense Items - Mobile Card */}
              <div className="md:hidden bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4">
                <h2 className="text-lg font-semibold text-white mb-4">Expense Items</h2>
                <div className="space-y-3">
                  {expense.items.map((item, index) => (
                    <div
                      key={index}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 active:scale-[0.98] transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {item.description}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {item.accountCode} - {item.accountName}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-[#E84545] ml-2">
                          QR {item.amount.toLocaleString()}
                        </p>
                      </div>
                      {item.notes && (
                        <p className="text-xs text-slate-500 mt-2 italic">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Expense Items - Desktop */}
              <div className="hidden md:block bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Receipt className="w-5 h-5 text-[#E84545]" />
                  <span>Expense Items</span>
                </h2>

                <div className="space-y-3">
                  {expense.items.map((item, index) => (
                    <div
                      key={index}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-[#E84545]/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-white">
                            {item.description}
                          </p>
                          <p className="text-sm text-slate-400 mt-1">
                            {item.accountCode} - {item.accountName}
                          </p>
                          {item.notes && (
                            <p className="text-sm text-slate-500 mt-2 italic">
                              {item.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-[#E84545]">
                            QR {item.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Voucher & Ledger Entries */}
              {expense.isPostedToGL && voucher && (
                <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 md:p-6">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-[#E84545]" />
                    <span>Accounting Entries</span>
                  </h2>

                  <div className="mb-4 p-3 bg-[#E84545]/10 border border-[#E84545]/20 rounded-lg">
                    <p className="text-sm text-[#E84545]">
                      <span className="font-semibold">Voucher:</span>{" "}
                      {voucher.voucherNumber}
                    </p>
                    <p className="text-xs text-slate-300 mt-1">
                      {voucher.narration}
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 px-3 text-sm font-medium text-slate-400">
                            Account
                          </th>
                          <th className="text-right py-2 px-3 text-sm font-medium text-slate-400">
                            Debit
                          </th>
                          <th className="text-right py-2 px-3 text-sm font-medium text-slate-400">
                            Credit
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerEntries.map((entry, index) => (
                          <tr
                            key={index}
                            className="border-b border-white/5"
                          >
                            <td className="py-3 px-3">
                              <p className="text-sm font-medium text-white">
                                {entry.accountNumber}
                              </p>
                              <p className="text-xs text-slate-400">
                                {entry.accountName}
                              </p>
                            </td>
                            <td className="py-3 px-3 text-right text-sm text-white">
                              {entry.debit > 0
                                ? `QR ${entry.debit.toLocaleString()}`
                                : "-"}
                            </td>
                            <td className="py-3 px-3 text-right text-sm text-white">
                              {entry.credit > 0
                                ? `QR ${entry.credit.toLocaleString()}`
                                : "-"}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-semibold bg-white/5">
                          <td className="py-3 px-3 text-sm text-slate-300">
                            Total
                          </td>
                          <td className="py-3 px-3 text-right text-sm text-[#E84545]">
                            QR {voucher.totalDebit.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right text-sm text-[#E84545]">
                            QR {voucher.totalCredit.toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Additional Info */}
            <div className="space-y-6">
              {/* Payment Info */}
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 md:p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-[#E84545]" />
                  <span>Payment Info</span>
                </h2>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-slate-400 mb-1">Payment Method</p>
                    <p className="text-white font-medium">
                      {expense.paymentMethod.replace("_", " ")}
                    </p>
                  </div>

                  {expense.paymentAccount && (
                    <div>
                      <p className="text-slate-400 mb-1">Payment Account</p>
                      <p className="text-white font-medium">
                        {expense.paymentAccount.code} -{" "}
                        {expense.paymentAccount.name}
                      </p>
                    </div>
                  )}

                  {expense.referenceNumber && (
                    <div>
                      <p className="text-slate-400 mb-1">Reference Number</p>
                      <p className="text-white font-medium">
                        {expense.referenceNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Vendor Info */}
              {expense.vendorName && (
                <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 md:p-6">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                    <Building className="w-5 h-5 text-[#E84545]" />
                    <span>Vendor Info</span>
                  </h2>

                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-slate-400 mb-1">Vendor Name</p>
                      <p className="text-white font-medium">
                        {expense.vendorName}
                      </p>
                    </div>

                    {expense.vendorPhone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <p className="text-white">{expense.vendorPhone}</p>
                      </div>
                    )}

                    {expense.vendorEmail && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <p className="text-white">{expense.vendorEmail}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Audit Info */}
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 md:p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <User className="w-5 h-5 text-[#E84545]" />
                  <span>Audit Info</span>
                </h2>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-slate-400 mb-1">Created By</p>
                    <p className="text-white font-medium">
                      {expense.createdBy.name ||
                        expense.createdBy.username ||
                        expense.createdBy.email}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(expense.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {expense.approvedBy && (
                    <div>
                      <p className="text-slate-400 mb-1">Approved By</p>
                      <p className="text-white font-medium">
                        {expense.approvedBy.name ||
                          expense.approvedBy.username ||
                          expense.approvedBy.email}
                      </p>
                      {expense.approvedAt && (
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(expense.approvedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-slate-400 mb-1">GL Status</p>
                    <p className="text-white font-medium">
                      {expense.isPostedToGL ? (
                        <span className="text-green-400">✓ Posted to Ledger</span>
                      ) : (
                        <span className="text-yellow-400">⚠ Not Posted</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {expense.notes && (
                <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 md:p-6">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-[#E84545]" />
                    <span>Notes</span>
                  </h2>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">
                    {expense.notes}
                  </p>
                </div>
              )}

              {/* Action Buttons - Desktop */}
              <div className="hidden md:block bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
                <div className="space-y-3">
                  {expense.status === "DRAFT" && !expense.isPostedToGL && (
                    <button
                      onClick={() => router.push(`/autocityPro/expenses/${expenseId}/edit`)}
                      disabled={actionLoading}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit Expense</span>
                    </button>
                  )}

                  {expense.status === "PENDING" && (
                    <button
                      onClick={() => handleAction("pay")}
                      disabled={actionLoading}
                      className="w-full px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Pay Now</span>
                    </button>
                  )}

                  {expense.status !== "CANCELLED" && (
                    <button
                      onClick={handleDelete}
                      disabled={actionLoading}
                      className="w-full px-4 py-3 bg-red-900/20 border border-red-800/50 text-red-400 rounded-lg hover:bg-red-900/30 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Expense</span>
                    </button>
                  )}

                  <button
                    onClick={fetchExpenseDetails}
                    disabled={actionLoading}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh Data</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-24"></div>
      </div>

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
              {expense.status === "DRAFT" && !expense.isPostedToGL && (
                <button
                  onClick={() => {
                    router.push(`/autocityPro/expenses/${expenseId}/edit`);
                    setShowMobileMenu(false);
                  }}
                  className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
                >
                  <span>Edit Expense</span>
                  <Edit className="h-5 w-5" />
                </button>
              )}

              {expense.status === "PENDING" && (
                <button
                  onClick={() => {
                    handleAction("pay");
                    setShowMobileMenu(false);
                  }}
                  className="w-full p-4 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-xl text-white font-semibold hover:opacity-90 transition-all flex items-center justify-between active:scale-95"
                >
                  <span>Pay Now</span>
                  <DollarSign className="h-5 w-5" />
                </button>
              )}

              {expense.status !== "CANCELLED" && (
                <button
                  onClick={() => {
                    handleDelete();
                    setShowMobileMenu(false);
                  }}
                  className="w-full p-4 bg-red-900/20 border border-red-800/50 rounded-xl text-red-400 font-semibold hover:bg-red-900/30 transition-all flex items-center justify-between active:scale-95"
                >
                  <span>Delete Expense</span>
                  <Trash2 className="h-5 w-5" />
                </button>
              )}

              <button
                onClick={() => {
                  printExpense();
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Print</span>
                <Printer className="h-5 w-5" />
              </button>

              <button
                onClick={() => {
                  shareExpense();
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Share</span>
                <Share2 className="h-5 w-5" />
              </button>

              <button
                onClick={() => {
                  fetchExpenseDetails();
                  setShowMobileMenu(false);
                  toast.success('Expense data refreshed');
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
    </MainLayout>
  );
}