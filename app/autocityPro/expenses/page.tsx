"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import CreateExpenseForm from "@/components/expenses/CreateExpenseForm"; // Import the form
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
        return "bg-green-100 text-green-800";
      case "PARTIALLY_PAID":
        return "bg-yellow-100 text-yellow-800";
      case "PENDING":
        return "bg-blue-100 text-blue-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-QA", {
      style: "currency",
      currency: "QAR",
    }).format(amount);
  };

  // Calculate summary
  const summary = expenses.reduce(
    (acc, exp) => {
      acc.total += exp.grandTotal || 0;
      acc.paid += exp.amountPaid || 0;
      acc.outstanding += exp.balanceDue || 0;
      return acc;
    },
    { total: 0, paid: 0, outstanding: 0 }
  );

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

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <div className="py-0.5 bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
                  <Receipt className="w-8 h-8" />
                  <span>Expenses Management</span>
                </h1>
                <p className="text-orange-100 mt-1">
                  Track and manage business expenses
                </p>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-medium hover:bg-orange-50 flex items-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="w-5 h-5" />
                <span>Record Expense</span>
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Total Expenses</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(summary.total)}
                  </p>
                </div>
                <div className="p-3 bg-orange-900/30 rounded-lg">
                  <Receipt className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Total Paid</p>
                  <p className="text-2xl font-bold text-green-400">
                    {formatCurrency(summary.paid)}
                  </p>
                </div>
                <div className="p-3 bg-green-900/30 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Outstanding</p>
                  <p className="text-2xl font-bold text-red-400">
                    {formatCurrency(summary.outstanding)}
                  </p>
                </div>
                <div className="p-3 bg-red-900/30 rounded-lg">
                  <Calendar className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6 mb-6">
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
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
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
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="">All Status</option>
                  <option value="PAID">Paid</option>
                  <option value="PARTIALLY_PAID">Partially Paid</option>
                  <option value="PENDING">Pending</option>
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
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
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
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={fetchExpenses}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Filter className="w-4 h-4" />
                  )}
                  <span>Filter</span>
                </button>
              </div>
            </div>
          </div>

          {/* Expenses List */}
          <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">
                Recent Expenses
              </h2>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
                <p className="text-slate-400">Loading expenses...</p>
              </div>
            ) : expenses.length === 0 ? (
              <div className="p-12 text-center">
                <Receipt className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">No expenses found</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium inline-flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record First Expense</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Expense #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Paid
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {expenses.map((expense) => {
                      const categoryConfig = getCategoryConfig(
                        expense.category
                      );
                      const CategoryIcon = categoryConfig.icon;

                      return (
                        <tr
                          key={expense._id}
                          className="hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                            {new Date(expense.expenseDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-white">
                              {expense.expenseNumber}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <div
                                className={`p-1.5 bg-${categoryConfig.color}-900/30 rounded`}
                              >
                                <CategoryIcon
                                  className={`w-4 h-4 text-${categoryConfig.color}-400`}
                                />
                              </div>
                              <span className="text-sm text-slate-300">
                                {categoryConfig.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                            {expense.vendorName || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-white">
                            {formatCurrency(expense.grandTotal)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-400">
                            {formatCurrency(expense.amountPaid)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span
                              className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                expense.status
                              )}`}
                            >
                              {expense.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <div className="flex items-center justify-end space-x-2">
                              <Link
                                href={`/autocityPro/expenses/${expense._id}`}
                              >
                                <button
                                  className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-900/20 rounded transition-colors"
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
            )}
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <CreateExpenseForm
            onClose={() => setShowCreateModal(false)}
            onSuccess={fetchExpenses}
          />
        )}
      </div>
    </MainLayout>
  );
}
