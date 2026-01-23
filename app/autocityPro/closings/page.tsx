"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import ClosingPreview from "@/components/closings/ClosingPreview";
import {
  Calendar,
  Lock,
  CheckCircle,
  XCircle,
  FileText,
  TrendingUp,
  DollarSign,
  BookOpen,
  AlertTriangle,
  Eye,
  Download,
  RefreshCw,
  MoreVertical,
  Filter,
  X,
  BarChart3,
  Clock,
  Wallet,
  ArrowUpRight,
  Zap,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";

interface ClosingData {
  _id: string;
  closingType: "day" | "month";
  closingDate: string;
  periodStart: string;
  periodEnd: string;
  status: "closed" | "locked" | "pending";
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  totalRevenue: number;
  netProfit: number;
  openingCash: number;
  cashSales: number;
  cashReceipts: number;
  cashPayments: number;
  closingCash: number;
  bankSales: number;
  bankPayments: number;
  openingBank: number;
  closingBank: number;
  totalOpeningBalance?: number;
  totalClosingBalance?: number;
  salesCount: number;
  totalDiscount: number;
  totalTax: number;
  openingStock: number;
  closingStock: number;
  stockValue: number;
  ledgerEntriesCount?: number;
  voucherIds?: string[];
  trialBalanceMatched?: boolean;
  closedBy: {
    firstName: string;
    lastName: string;
  };
  closedAt: string;
  verifiedBy?: {
    firstName: string;
    lastName: string;
  };
  verifiedAt?: string;
  notes?: string;
}

export default function ClosingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [closings, setClosings] = useState<ClosingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [newClosing, setNewClosing] = useState({
    closingType: "day" as "day" | "month",
    closingDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const [summary, setSummary] = useState({
    totalClosings: 0,
    totalRevenue: 0,
    totalProfit: 0,
    avgProfit: 0,
  });

  useEffect(() => {
    fetchUser();
    fetchClosings();

    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => window.removeEventListener("resize", checkIfMobile);
  }, [filterType, filterStatus]);

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

  const fetchClosings = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType !== "all") params.append("closingType", filterType);
      if (filterStatus !== "all") params.append("status", filterStatus);

      const url = `/api/closings${
        params.toString() ? "?" + params.toString() : ""
      }`;

      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setClosings(data.closings || []);

        const totalRevenue = data.closings.reduce(
          (sum: number, c: ClosingData) => sum + c.totalRevenue,
          0
        );
        const totalProfit = data.closings.reduce(
          (sum: number, c: ClosingData) => sum + c.netProfit,
          0
        );
        const avgProfit =
          data.closings.length > 0 ? totalProfit / data.closings.length : 0;

        setSummary({
          totalClosings: data.closings.length,
          totalRevenue,
          totalProfit,
          avgProfit,
        });
      }
    } catch (error) {
      console.error("Failed to fetch closings");
      toast.error("Failed to fetch closings");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (isClosing) return;

    setIsClosing(true);
    try {
      const res = await fetch("/api/closings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newClosing),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(
          data.message ||
            `${
              newClosing.closingType === "day" ? "Day" : "Month"
            } closed successfully!`
        );

        setShowCloseModal(false);
        setShowPreview(false);
        setNewClosing({
          closingType: "day",
          closingDate: new Date().toISOString().split("T")[0],
          notes: "",
        });
        fetchClosings();
      } else {
        toast.error(data.error || "Failed to close period");

        if (data.expectedDate || data.expectedMonth) {
          setTimeout(() => {
            toast.error(
              `Please close ${data.expectedDate || data.expectedMonth} first`,
              { duration: 5000 }
            );
          }, 100);
        }
      }
    } catch (error) {
      console.error("Closing error:", error);
      toast.error("Failed to close period");
    } finally {
      setIsClosing(false);
    }
  };

  const handleShowPreview = () => {
    if (!newClosing.closingDate) {
      toast.error("Please select a closing date");
      return;
    }
    setShowPreview(true);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "locked":
        return "bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30 text-red-400";
      case "closed":
        return "bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400";
      case "pending":
        return "bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400";
      default:
        return "bg-gradient-to-br from-gray-500/20 to-gray-600/10 border-gray-500/30 text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "locked":
        return <Lock className="h-3.5 w-3.5" />;
      case "closed":
        return <CheckCircle className="h-3.5 w-3.5" />;
      case "pending":
        return <Clock className="h-3.5 w-3.5" />;
      default:
        return <FileText className="h-3.5 w-3.5" />;
    }
  };

  const clearFilters = () => {
    setFilterType("all");
    setFilterStatus("all");
    setSearchQuery("");
  };

  const downloadClosingsCSV = () => {
    if (closings.length === 0) {
      toast.error("No closings to export");
      return;
    }

    const headers = [
      "Date",
      "Type",
      "Status",
      "Revenue",
      "Expenses",
      "Profit",
      "Cash Sales",
      "Closed By",
    ];
    const rows = closings.map((c) => [
      new Date(c.closingDate).toLocaleDateString(),
      c.closingType,
      c.status,
      c.totalRevenue,
      c.totalExpenses,
      c.netProfit,
      c.cashSales,
      `${c.closedBy?.firstName} ${c.closedBy?.lastName}`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `closings_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${closings.length} closings to CSV`);
  };

  const downloadClosingPDF = async (closingId: string) => {
    try {
      toast.loading("Generating PDF...", { id: "pdf-generate" });

      const { default: jsPDF } = await import("jspdf");
      await import("jspdf-autotable");

      const res = await fetch(`/api/closings/${closingId}/pdf`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch closing data");

      const { data } = await res.json();

      const { generateClosingPDF } = await import(
        "@/lib/utils/closingPdfGenerator"
      );
      const pdfBlob = await generateClosingPDF(data);

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      const closingType =
        data.closing.closingType === "day" ? "Daily" : "Monthly";
      const dateStr = new Date(data.closing.closingDate)
        .toLocaleDateString("en-US")
        .replace(/\//g, "-");
      link.download = `${closingType}_Closing_${dateStr}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDF downloaded successfully!", { id: "pdf-generate" });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF", { id: "pdf-generate" });
    }
  };

  const filteredClosings = closings.filter((closing) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      closing.closingType.toLowerCase().includes(query) ||
      closing.status.toLowerCase().includes(query) ||
      new Date(closing.closingDate)
        .toLocaleDateString()
        .toLowerCase()
        .includes(query) ||
      `${closing.closedBy?.firstName} ${closing.closedBy?.lastName}`
        .toLowerCase()
        .includes(query)
    );
  });

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#0a0a0a]">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-red-500/10">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Period Closings
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  {filteredClosings.length} records
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(true)}
                  className="p-2.5 rounded-lg bg-[#1a1a1a] border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 active:scale-95 transition-all"
                >
                  <Filter className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowMobileMenu(true)}
                  className="p-2.5 rounded-lg bg-[#1a1a1a] border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 active:scale-95 transition-all"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-950/40 via-[#0a0a0a] to-[#0a0a0a]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtMy4zMTQgMC02IDIuNjg2LTYgNnMyLjY4NiA2IDYgNiA2LTIuNjg2IDYtNi0yLjY4Ni02LTYtNnoiIHN0cm9rZT0iIzk5MTgxOCIgc3Ryb2tlLXdpZHRoPSIuNSIgb3BhY2l0eT0iLjEiLz48L2c+PC9zdmc+')] opacity-20" />

          <div className="relative px-8 py-16">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-2xl" />
                    <div className="relative p-4 bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-2xl backdrop-blur-sm">
                      <BookOpen className="h-10 w-10 text-red-400" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
                      Period Closings
                    </h1>
                    <p className="text-gray-400 text-sm">
                      Comprehensive financial period management & ledger
                      verification
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={downloadClosingsCSV}
                    className="group flex items-center gap-2 px-5 py-3 bg-[#1a1a1a] border border-red-500/20 text-gray-300 rounded-xl hover:bg-red-500/10 hover:text-white hover:border-red-500/40 transition-all duration-300"
                  >
                    <Download className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Export CSV</span>
                  </button>
                  <button
                    onClick={() => setShowCloseModal(true)}
                    className="group relative flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-xl hover:from-red-500 hover:to-red-600 transition-all duration-300 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/40"
                  >
                    <div className="absolute inset-0 bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Lock className="h-4 w-4 relative z-10 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold relative z-10">
                      Close Period
                    </span>
                  </button>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative p-6 bg-[#141414] border border-red-500/10 rounded-2xl hover:border-red-500/30 transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2.5 bg-red-500/10 rounded-lg">
                        <Calendar className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="p-1.5 bg-red-500/5 rounded-lg">
                        <Zap className="h-3.5 w-3.5 text-red-400" />
                      </div>
                    </div>
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">
                      Total Closings
                    </p>
                    <p className="text-3xl font-bold text-white tracking-tight">
                      {summary.totalClosings}
                    </p>
                  </div>
                </div>

                <div className="group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative p-6 bg-[#141414] border border-red-500/10 rounded-2xl hover:border-red-500/30 transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2.5 bg-blue-500/10 rounded-lg">
                        <DollarSign className="h-5 w-5 text-blue-400" />
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-blue-400" />
                    </div>
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">
                      Total Revenue
                    </p>
                    <p className="text-3xl font-bold text-white tracking-tight">
                      {summary.totalRevenue.toLocaleString("en-QA", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">QAR</p>
                  </div>
                </div>

                <div className="group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative p-6 bg-[#141414] border border-red-500/10 rounded-2xl hover:border-red-500/30 transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2.5 bg-emerald-500/10 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-emerald-400" />
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                    </div>
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">
                      Total Profit
                    </p>
                    <p
                      className={`text-3xl font-bold tracking-tight ${
                        summary.totalProfit >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {summary.totalProfit.toLocaleString("en-QA", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">QAR</p>
                  </div>
                </div>

                <div className="group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative p-6 bg-[#141414] border border-red-500/10 rounded-2xl hover:border-red-500/30 transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2.5 bg-purple-500/10 rounded-lg">
                        <BarChart3 className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 rounded-full">
                        <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wide">
                          Avg
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">
                      Avg Profit
                    </p>
                    <p
                      className={`text-3xl font-bold tracking-tight ${
                        summary.avgProfit >= 0
                          ? "text-purple-400"
                          : "text-red-400"
                      }`}
                    >
                      {summary.avgProfit.toLocaleString("en-QA", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">QAR per period</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[140px] md:pt-8 pb-8">
          <div className="max-w-7xl mx-auto">
            {/* Desktop Filters & Search */}
            <div className="hidden md:block mb-8">
              <div className="p-6 bg-[#141414] border border-red-500/10 rounded-2xl">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Search Closings
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by date, type, status..."
                        className="w-full pl-10 pr-4 py-3 bg-[#1a1a1a] border border-red-500/20 rounded-xl focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all text-white placeholder:text-gray-600"
                      />
                    </div>
                  </div>

                  <div className="col-span-3">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Period Type
                    </label>
                    <div className="flex gap-2">
                      {["all", "day", "month"].map((type) => (
                        <button
                          key={type}
                          onClick={() => setFilterType(type)}
                          className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
                            filterType === type
                              ? "bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg shadow-red-500/25"
                              : "bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#1f1f1f] border border-red-500/10 hover:border-red-500/30"
                          }`}
                        >
                          {type === "all"
                            ? "All"
                            : type === "day"
                            ? "Daily"
                            : "Monthly"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-3">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Status
                    </label>
                    <div className="flex gap-2">
                      {["all", "closed", "locked"].map((status) => (
                        <button
                          key={status}
                          onClick={() => setFilterStatus(status)}
                          className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
                            filterStatus === status
                              ? "bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg shadow-red-500/25"
                              : "bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#1f1f1f] border border-red-500/10 hover:border-red-500/30"
                          }`}
                        >
                          {status === "all"
                            ? "All"
                            : status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2 flex items-end">
                    <button
                      onClick={clearFilters}
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-red-500/20 text-gray-400 rounded-xl hover:text-white hover:border-red-500/40 transition-all font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Closings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full flex flex-col items-center justify-center py-24">
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full animate-pulse" />
                    <RefreshCw className="relative h-12 w-12 text-red-500 animate-spin" />
                  </div>
                  <p className="text-gray-400 text-lg mt-6 font-medium">
                    Loading closings...
                  </p>
                </div>
              ) : closings.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-24">
                  <div className="p-6 bg-[#141414] border border-red-500/10 rounded-2xl mb-6">
                    <BookOpen className="h-16 w-16 text-gray-700" />
                  </div>
                  <p className="text-gray-300 text-xl font-semibold mb-2">
                    No closings found
                  </p>
                  <p className="text-gray-500 text-sm mb-6">
                    Start managing your financial periods
                  </p>
                  <button
                    onClick={() => setShowCloseModal(true)}
                    className="px-8 py-3 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-xl hover:from-red-500 hover:to-red-600 transition-all duration-300 font-semibold shadow-lg shadow-red-500/25"
                  >
                    Close First Period
                  </button>
                </div>
              ) : (
                closings.map((closing) => {
                  const totalOpeningBalance =
                    closing.totalOpeningBalance ??
                    closing.openingCash + closing.openingBank;
                  const totalClosingBalance =
                    closing.totalClosingBalance ??
                    closing.closingCash + closing.closingBank;

                  return (
                    <div key={closing._id} className="group relative">
                      {/* Glow Effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 via-red-500/5 to-red-500/0 opacity-0 group-hover:opacity-100 rounded-2xl blur-xl transition-all duration-500" />

                      <div className="relative bg-[#141414] border border-red-500/10 group-hover:border-red-500/30 rounded-2xl overflow-hidden transition-all duration-300">
                        {/* Card Header */}
                        <div className="relative p-5 bg-gradient-to-br from-[#1a1a1a] to-[#141414] border-b border-red-500/10">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-red-500/10 rounded-lg">
                                <Calendar className="h-4 w-4 text-red-400" />
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-white">
                                  {closing.closingType === "day"
                                    ? "Daily"
                                    : "Monthly"}{" "}
                                  Closing
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {new Date(
                                    closing.closingDate
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </p>
                              </div>
                            </div>
                            <div
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${getStatusColor(
                                closing.status
                              )}`}
                            >
                              {getStatusIcon(closing.status)}
                              <span className="text-[10px] font-bold uppercase tracking-wide">
                                {closing.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-5 space-y-4">
                          {/* Financial Summary */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center p-3 bg-[#1a1a1a] rounded-xl">
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Revenue
                              </span>
                              <span className="text-lg font-bold text-emerald-400">
                                {closing.totalRevenue.toLocaleString("en-QA", {
                                  minimumFractionDigits: 0,
                                })}
                              </span>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-[#1a1a1a] rounded-xl">
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Expenses
                              </span>
                              <span className="text-lg font-bold text-red-400">
                                {closing.totalExpenses.toLocaleString("en-QA", {
                                  minimumFractionDigits: 0,
                                })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-[#1a1a1a] rounded-xl">
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Purchases
                              </span>
                              <span className="text-lg font-bold text-red-400">
                                {closing.totalPurchases.toLocaleString("en-QA", {
                                  minimumFractionDigits: 0,
                                })}
                              </span>
                            </div>


                            <div className="relative p-4 bg-gradient-to-br from-red-500/5 to-red-600/5 rounded-xl border border-red-500/20">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                                  Net Profit
                                </span>
                                <span
                                  className={`text-2xl font-black ${
                                    closing.netProfit >= 0
                                      ? "text-emerald-400"
                                      : "text-red-400"
                                  }`}
                                >
                                  {closing.netProfit.toLocaleString("en-QA", {
                                    minimumFractionDigits: 0,
                                  })}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-600 mt-1">
                                QAR
                              </p>
                            </div>
                          </div>

                          {/* Total Balance */}
                          <div className="relative p-4 bg-gradient-to-br from-purple-500/5 to-purple-600/5 rounded-xl border border-purple-500/20">
                            <div className="flex items-center gap-2 mb-3">
                              <Wallet className="h-4 w-4 text-purple-400" />
                              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wide">
                                Total Balance
                              </h4>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">
                                  Opening
                                </span>
                                <span className="text-sm font-semibold text-gray-400">
                                  {totalOpeningBalance.toLocaleString("en-QA", {
                                    minimumFractionDigits: 0,
                                  })}
                                </span>
                              </div>

                              <div className="h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />

                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-purple-400 uppercase">
                                  Closing
                                </span>
                                <span className="text-xl font-black text-purple-400">
                                  {totalClosingBalance.toLocaleString("en-QA", {
                                    minimumFractionDigits: 0,
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Cash & Bank Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* Cash */}
                            <div className="p-3 bg-[#1a1a1a] rounded-xl border border-blue-500/10">
                              <div className="flex items-center gap-1.5 mb-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full" />
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">
                                  Cash
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Open</span>
                                  <span className="text-gray-400 font-medium">
                                    {closing.openingCash.toLocaleString(
                                      "en-QA",
                                      {
                                        minimumFractionDigits: 0,
                                      }
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">
                                    Movement
                                  </span>
                                  <span
                                    className={`font-semibold ${
                                      closing.closingCash -
                                        closing.openingCash >=
                                      0
                                        ? "text-emerald-400"
                                        : "text-red-400"
                                    }`}
                                  >
                                    {(
                                      closing.closingCash - closing.openingCash
                                    ).toLocaleString("en-QA")}
                                  </span>
                                </div>
                                <div className="pt-1.5 border-t border-blue-500/10">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-blue-400 font-bold">
                                      Close
                                    </span>
                                    <span className="text-blue-400 font-bold">
                                      {closing.closingCash.toLocaleString(
                                        "en-QA",
                                        {
                                          minimumFractionDigits: 0,
                                        }
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Bank */}
                            <div className="p-3 bg-[#1a1a1a] rounded-xl border border-emerald-500/10">
                              <div className="flex items-center gap-1.5 mb-2">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
                                  Bank
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Open</span>
                                  <span className="text-gray-400 font-medium">
                                    {closing.openingBank.toLocaleString(
                                      "en-QA",
                                      {
                                        minimumFractionDigits: 0,
                                      }
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">
                                    Movement
                                  </span>
                                  <span
                                    className={`font-semibold ${
                                      closing.closingBank -
                                        closing.openingBank >=
                                      0
                                        ? "text-emerald-400"
                                        : "text-red-400"
                                    }`}
                                  >
                                    {(
                                      closing.closingBank - closing.openingBank
                                    ).toLocaleString("en-QA")}
                                  </span>
                                </div>
                                <div className="pt-1.5 border-t border-emerald-500/10">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-emerald-400 font-bold">
                                      Close
                                    </span>
                                    <span className="text-emerald-400 font-bold">
                                      {closing.closingBank.toLocaleString(
                                        "en-QA",
                                        {
                                          minimumFractionDigits: 0,
                                        }
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Metrics Grid */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="p-3 bg-[#1a1a1a] rounded-lg text-center">
                              <p className="text-[10px] text-gray-600 font-medium uppercase mb-1">
                                Sales
                              </p>
                              <p className="text-lg font-bold text-white">
                                {closing.salesCount}
                              </p>
                            </div>
                            <div className="p-3 bg-[#1a1a1a] rounded-lg text-center">
                              <p className="text-[10px] text-gray-600 font-medium uppercase mb-1">
                                Disc
                              </p>
                              <p className="text-lg font-bold text-white">
                                {closing.totalDiscount.toFixed(0)}
                              </p>
                            </div>
                            <div className="p-3 bg-[#1a1a1a] rounded-lg text-center">
                              <p className="text-[10px] text-gray-600 font-medium uppercase mb-1">
                                Tax
                              </p>
                              <p className="text-lg font-bold text-white">
                                {closing.totalTax.toFixed(0)}
                              </p>
                            </div>
                          </div>

                          {/* Ledger Badge */}
                          {closing.ledgerEntriesCount && (
                            <div className="flex items-center justify-between p-3 bg-purple-500/5 rounded-xl border border-purple-500/20">
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-3.5 w-3.5 text-purple-400" />
                                <span className="text-xs font-medium text-purple-400">
                                  {closing.ledgerEntriesCount} Ledger Entries
                                </span>
                              </div>
                              {closing.trialBalanceMatched && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 rounded-full">
                                  <CheckCircle className="h-3 w-3 text-emerald-400" />
                                  <span className="text-[10px] font-bold text-emerald-400 uppercase">
                                    Balanced
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Notes */}
                          {closing.notes && (
                            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                              <div className="flex items-start gap-2">
                                <FileText className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-amber-300 line-clamp-2">
                                  {closing.notes}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Footer */}
                          <div className="pt-3 border-t border-red-500/10">
                            <div className="flex items-center justify-between text-[10px] text-gray-600 mb-3">
                              <span>
                                By {closing.closedBy?.firstName}{" "}
                                {closing.closedBy?.lastName}
                              </span>
                              <span>
                                {new Date(
                                  closing.closedAt
                                ).toLocaleDateString()}
                              </span>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() =>
                                  router.push(
                                    `/autocityPro/closings/${closing._id}`
                                  )
                                }
                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1a1a1a] border border-red-500/20 text-gray-300 rounded-xl hover:bg-red-500/10 hover:text-white hover:border-red-500/40 transition-all duration-300 font-medium"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span className="text-xs">View</span>
                              </button>
                              <button
                                onClick={() => downloadClosingPDF(closing._id)}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1a1a1a] border border-red-500/20 text-gray-300 rounded-xl hover:bg-red-500/10 hover:text-white hover:border-red-500/40 transition-all duration-300 font-medium"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span className="text-xs">PDF</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="md:hidden h-6" />
      </div>

      {/* Close Period Modal with Preview */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="relative bg-[#0f0f0f] border border-red-500/20 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 via-red-500/10 to-transparent" />
              <div className="relative px-6 py-6 border-b border-red-500/20">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-500/10 rounded-xl">
                      <Lock className="h-6 w-6 text-red-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white tracking-tight">
                        Close Period
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {showPreview
                          ? "Review details before closing"
                          : "Configure period closing settings"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowCloseModal(false);
                      setShowPreview(false);
                    }}
                    className="p-2 text-gray-500 hover:text-white hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[calc(90vh-200px)] overflow-y-auto">
              {!showPreview ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                      Closing Type
                    </label>
                    <select
                      value={newClosing.closingType}
                      onChange={(e) =>
                        setNewClosing({
                          ...newClosing,
                          closingType: e.target.value as "day" | "month",
                        })
                      }
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-red-500/20 rounded-xl focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all text-white font-medium"
                    >
                      <option value="day">Daily Closing</option>
                      <option value="month">Monthly Closing</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                      Closing Date
                    </label>
                    <input
                      type="date"
                      value={newClosing.closingDate}
                      onChange={(e) =>
                        setNewClosing({
                          ...newClosing,
                          closingDate: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-red-500/20 rounded-xl focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                      Notes
                    </label>
                    <textarea
                      value={newClosing.notes}
                      onChange={(e) =>
                        setNewClosing({ ...newClosing, notes: e.target.value })
                      }
                      rows={4}
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-red-500/20 rounded-xl focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all text-white resize-none font-medium"
                      placeholder="Add notes or observations..."
                    />
                  </div>

                  {/* Warning */}
                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                    <div className="flex gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-400 mb-2">
                          Important Notice
                        </h4>
                        <ul className="text-xs text-amber-300/80 space-y-1.5">
                          <li>• All transactions will be locked</li>
                          <li>• Financial reports will be generated</li>
                          <li>
                            • Late-night transactions (until 6 AM) will be
                            included
                          </li>
                          <li>• First closing includes all historical data</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Preview Component */}
                  {user && (
                    <ClosingPreview
                      closingType={newClosing.closingType}
                      closingDate={newClosing.closingDate}
                      outletId={user.outletId}
                    />
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#141414] border-t border-red-500/10 flex justify-between gap-3">
              <button
                onClick={() => {
                  if (showPreview) {
                    setShowPreview(false);
                  } else {
                    setShowCloseModal(false);
                  }
                }}
                className="px-6 py-2.5 bg-[#1a1a1a] border border-red-500/20 text-gray-300 rounded-xl hover:text-white hover:bg-[#1f1f1f] hover:border-red-500/40 transition-all font-medium"
              >
                {showPreview ? "Back" : "Cancel"}
              </button>

              <div className="flex gap-3">
                {!showPreview && (
                  <button
                    onClick={handleShowPreview}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-medium shadow-lg shadow-blue-500/25"
                  >
                    Preview
                  </button>
                )}
                <button
                  onClick={handleClose}
                  disabled={isClosing}
                  className={`px-8 py-2.5 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-xl hover:from-red-500 hover:to-red-600 transition-all font-semibold shadow-lg shadow-red-500/25 ${
                    isClosing ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isClosing ? "Closing..." : "Close Period"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filter Modal */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 bg-black/90 backdrop-blur-md z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 bg-[#0f0f0f] rounded-t-3xl border-t border-red-500/20 p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 rounded-lg bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-red-500/10 active:scale-95 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Period Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-red-500/20 rounded-xl text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50"
                >
                  <option value="all">All Periods</option>
                  <option value="day">Daily</option>
                  <option value="month">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-red-500/20 rounded-xl text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50"
                >
                  <option value="all">All Status</option>
                  <option value="closed">Closed</option>
                  <option value="locked">Locked</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    clearFilters();
                    setShowFilters(false);
                  }}
                  className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-red-500/20 rounded-xl text-gray-300 hover:text-white hover:border-red-500/40 transition-all active:scale-95 font-medium"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 px-4 py-3 bg-gradient-to-br from-red-600 to-red-700 rounded-xl text-white font-semibold active:scale-95 transition-all shadow-lg shadow-red-500/25"
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
        <div className="md:hidden fixed inset-0 bg-black/90 backdrop-blur-md z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 bg-[#0f0f0f] rounded-t-3xl border-t border-red-500/20 p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Actions</h2>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 rounded-lg bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-red-500/10 active:scale-95 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowCloseModal(true);
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#1a1a1a] border border-red-500/20 rounded-xl text-white font-semibold hover:bg-red-500/10 hover:border-red-500/40 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Close Period</span>
                <Lock className="h-5 w-5" />
              </button>
              <button
                onClick={downloadClosingsCSV}
                className="w-full p-4 bg-[#1a1a1a] border border-red-500/20 rounded-xl text-white font-semibold hover:bg-red-500/10 hover:border-red-500/40 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Export CSV</span>
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  fetchClosings();
                  setShowMobileMenu(false);
                  toast.success("Closings refreshed");
                }}
                className="w-full p-4 bg-[#1a1a1a] border border-red-500/20 rounded-xl text-white font-semibold hover:bg-red-500/10 hover:border-red-500/40 transition-all flex items-center justify-between active:scale-95"
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
