// app/autocityPro/purchases/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
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
} from "lucide-react";
import toast from "react-hot-toast";

export default function PurchasesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

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

  const fetchPurchases = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
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
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  const filteredPurchases = purchases.filter((purchase) => {
    const matchesSearch =
      purchase.purchaseNumber
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
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

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "DRAFT":
        return "bg-yellow-100 text-yellow-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      CASH: "bg-green-100 text-green-800",
      CARD: "bg-blue-100 text-blue-800",
      BANK_TRANSFER: "bg-purple-100 text-purple-800",
      CREDIT: "bg-orange-100 text-orange-800",
    };
    return colors[method] || "bg-gray-100 text-gray-800";
  };

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      {/* Header */}
      <div className="py-2 bg-gradient-to-r from-blue-600 to-cyan-600 border border-cyan-500/30 shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSIjOUM5MkFDIiBmaWxsLW9wYWNpdHk9IjAuMDUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PGNpcmNsZSBjeD0iMyIgY3k9IjMiIHI9IjMiLz48Y2lyY2xlIGN4PSIxMyIgY3k9IjEzIiByPSIzIi8+PC9nPjwvc3ZnPg==')] opacity-10"></div>

        <div className="p-6 relative z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <ShoppingCart className="h-8 w-8 text-white" />
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Purchases</h1>
                <p className="text-blue-100">Manage your purchase orders</p>
              </div>
            </div>
            <button
              onClick={() => router.push("/autocityPro/purchases/new")}
              className="flex items-center space-x-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors shadow-lg font-semibold"
            >
              <Plus className="h-5 w-5" />
              <span>New Purchase</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-900 min-h-screen">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Purchases</p>
                <p className="text-3xl font-bold mt-2">{stats.total}</p>
              </div>
              <Package className="h-12 w-12 text-blue-200 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Total Amount</p>
                <p className="text-2xl font-bold mt-2">
                  QAR {stats.totalAmount.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-12 w-12 text-emerald-200 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Paid</p>
                <p className="text-2xl font-bold mt-2">
                  QAR {stats.totalPaid.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-purple-200 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Balance Due</p>
                <p className="text-2xl font-bold mt-2">
                  QAR {stats.totalDue.toFixed(2)}
                </p>
              </div>
              <Calendar className="h-12 w-12 text-orange-200 opacity-80" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by purchase # or supplier..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              >
                <option value="all">All Status</option>
                <option value="COMPLETED">Completed</option>
                <option value="DRAFT">Draft</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Supplier Filter */}
            <div>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              >
                <option value="all">All Suppliers</option>
                {suppliers.map((supplier) => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            <div>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setSupplierFilter("all");
                  setDateRange({ startDate: "", endDate: "" });
                }}
                className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center justify-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>Clear Filters</span>
              </button>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              />
            </div>
          </div>
        </div>

        {/* Purchases Table */}
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Purchase #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {loading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-12 text-center text-slate-400"
                    >
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span className="ml-3">Loading purchases...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredPurchases.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-12 text-center text-slate-400"
                    >
                      <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                      <p className="text-lg font-medium">No purchases found</p>
                      <p className="text-sm mt-2">
                        Create your first purchase order
                      </p>
                      <button
                        onClick={() => router.push("/autocityPro/purchases/new")}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>New Purchase</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((purchase) => (
                    <tr
                      key={purchase._id}
                      className="hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">
                          {purchase.purchaseNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-300">
                          {new Date(purchase.purchaseDate).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(purchase.purchaseDate).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">
                          {purchase.supplierName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-300">
                          {purchase.items?.length || 0} items
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-white">
                          QAR {purchase.grandTotal?.toFixed(2) || "0.00"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-emerald-400">
                          QAR {purchase.amountPaid?.toFixed(2) || "0.00"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div
                          className={`text-sm font-semibold ${
                            (purchase.balanceDue || 0) > 0
                              ? "text-red-400"
                              : "text-slate-500"
                          }`}
                        >
                          QAR {purchase.balanceDue?.toFixed(2) || "0.00"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getPaymentMethodBadge(
                            purchase.paymentMethod
                          )}`}
                        >
                          {purchase.paymentMethod?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            purchase.status
                          )}`}
                        >
                          {purchase.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() =>
                            router.push(`/autocityPro/purchases/${purchase._id}`)
                          }
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Footer */}
        {filteredPurchases.length > 0 && (
          <div className="mt-6 bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-sm text-slate-400">Total Purchases</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {stats.total}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Amount</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">
                  QAR {stats.totalAmount.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Paid</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">
                  QAR {stats.totalPaid.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Balance Due</p>
                <p className="text-2xl font-bold text-orange-400 mt-1">
                  QAR {stats.totalDue.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}