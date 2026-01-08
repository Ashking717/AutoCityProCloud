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

  useEffect(() => {
    fetchExpenseDetails();
  }, [expenseId]);

  const fetchExpenseDetails = async () => {
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
        router.push("/expenses");
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
        router.push("/expenses");
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
        router.push("/login");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to logout");
      }
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to logout");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300">Loading expense details...</p>
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <MainLayout user={null} onLogout={handleLogout}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-slate-300 text-lg mb-4">Expense not found</p>
          <Link href={`/autocityPro/expenses`}>
            <button
              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-900/20 rounded transition-colors"
              title="View Details"
            ></button>
          </Link>
        </div>
      </div>
      </MainLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      PAID: {
        bg: "bg-green-900/30",
        text: "text-green-400",
        border: "border-green-700",
        icon: CheckCircle,
      },
      PENDING: {
        bg: "bg-yellow-900/30",
        text: "text-yellow-400",
        border: "border-yellow-700",
        icon: Clock,
      },
      PARTIALLY_PAID: {
        bg: "bg-blue-900/30",
        text: "text-blue-400",
        border: "border-blue-700",
        icon: DollarSign,
      },
      CANCELLED: {
        bg: "bg-red-900/30",
        text: "text-red-400",
        border: "border-red-700",
        icon: XCircle,
      },
      DRAFT: {
        bg: "bg-slate-700/30",
        text: "text-slate-400",
        border: "border-slate-600",
        icon: FileText,
      },
    };

    const badge = badges[status as keyof typeof badges] || badges.DRAFT;
    const Icon = badge.icon;

    return (
      <MainLayout user={null} onLogout={handleLogout}>
      <span
        className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}
      >
        <Icon className="w-4 h-4" />
        <span className="font-medium">{status.replace("_", " ")}</span>
      </span>
      </MainLayout>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push("/expenses")}
            className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Expenses</span>
          </button>

          <div className="flex items-center space-x-3">
            {expense.status === "DRAFT" && !expense.isPostedToGL && (
              <button
                onClick={() => router.push(`/expenses/${expenseId}/edit`)}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}

            {expense.status === "PENDING" && (
              <button
                onClick={() => handleAction("pay")}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
              >
                <DollarSign className="w-4 h-4" />
                <span>Pay Now</span>
              </button>
            )}

            {expense.status !== "CANCELLED" && (
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Expense Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Expense Header Card */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    {expense.expenseNumber}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm text-slate-400">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(expense.expenseDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Tag className="w-4 h-4" />
                      <span>{getCategoryLabel(expense.category)}</span>
                    </div>
                  </div>
                </div>
                {getStatusBadge(expense.status)}
              </div>

              {/* Amount Summary */}
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Subtotal</p>
                    <p className="text-lg font-semibold text-white">
                      QAR {expense.subtotal.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Tax</p>
                    <p className="text-lg font-semibold text-white">
                      QAR {expense.taxAmount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Amount Paid</p>
                    <p className="text-lg font-semibold text-green-400">
                      QAR {expense.amountPaid.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Balance Due</p>
                    <p className="text-lg font-semibold text-orange-400">
                      QAR {expense.balanceDue.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-600">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold text-slate-300">
                      Grand Total
                    </p>
                    <p className="text-2xl font-bold text-orange-400">
                      QAR {expense.grandTotal.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Expense Items */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-orange-400" />
                <span>Expense Items</span>
              </h2>

              <div className="space-y-3">
                {expense.items.map((item, index) => (
                  <div
                    key={index}
                    className="bg-slate-700/30 border border-slate-600 rounded-lg p-4"
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
                        <p className="text-lg font-semibold text-orange-400">
                          QAR {item.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Voucher & Ledger Entries */}
            {expense.isPostedToGL && voucher && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <span>Accounting Entries</span>
                </h2>

                <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
                  <p className="text-sm text-blue-300">
                    <span className="font-semibold">Voucher:</span>{" "}
                    {voucher.voucherNumber}
                  </p>
                  <p className="text-xs text-blue-400 mt-1">
                    {voucher.narration}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-600">
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
                          className="border-b border-slate-700/50"
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
                              ? `QAR ${entry.debit.toFixed(2)}`
                              : "-"}
                          </td>
                          <td className="py-3 px-3 text-right text-sm text-white">
                            {entry.credit > 0
                              ? `QAR ${entry.credit.toFixed(2)}`
                              : "-"}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-semibold bg-slate-700/30">
                        <td className="py-3 px-3 text-sm text-slate-300">
                          Total
                        </td>
                        <td className="py-3 px-3 text-right text-sm text-orange-400">
                          QAR {voucher.totalDebit.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right text-sm text-orange-400">
                          QAR {voucher.totalCredit.toFixed(2)}
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
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-green-400" />
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
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Building className="w-5 h-5 text-purple-400" />
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
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <User className="w-5 h-5 text-blue-400" />
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
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <span>Notes</span>
                </h2>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">
                  {expense.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </MainLayout>
  );
}
