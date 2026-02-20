// app/autocityPro/ledger-entries/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  BookOpen,
  Search,
  Filter,
  X,
  ChevronLeft,
  FileDown,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
  Receipt,
  DollarSign,
  CreditCard,
  BarChart3,
  AlertCircle,
  CheckCircle,
  MoreVertical,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";

interface LedgerEntry {
  _id: string;
  voucherId: string;
  voucherNumber: string;
  voucherType: string;
  accountId: {
    _id: string;
    accountName: string;
    accountNumber: string;
    accountType: string;
  };
  accountName: string;
  accountNumber: string;
  debit: number;
  credit: number;
  date: string;
  narration: string;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  isReversal: boolean;
  reversalReason?: string;
  createdBy: {
    name: string;
    email: string;
  };
  createdAt: string;
}

interface Statistics {
  totalDebit: number;
  totalCredit: number;
  entriesCount: number;
  difference: number;
}

export default function LedgerEntriesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [statistics, setStatistics] = useState<Statistics>({
    totalDebit: 0,
    totalCredit: 0,
    entriesCount: 0,
    difference: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [voucherTypeFilter, setVoucherTypeFilter] = useState("all");
  const [referenceTypeFilter, setReferenceTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(new Date().getFullYear(), 0, 1)
      .toISOString()
      .split("T")[0],
    toDate: new Date().toISOString().split("T")[0],
  });

  // UI State
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);

  // Infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUser();

    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const handleVoucherTypeChange = (value: string) => {
    setVoucherTypeFilter(value);
    resetAndFetch({ voucherType: value });
  };

  const handleReferenceTypeChange = (value: string) => {
    setReferenceTypeFilter(value);
    resetAndFetch({ referenceType: value });
  };

  const handleFromDateChange = (value: string) => {
    setDateRange(prev => ({ ...prev, fromDate: value }));
    resetAndFetch({ fromDate: value });
  };

  const handleToDateChange = (value: string) => {
    setDateRange(prev => ({ ...prev, toDate: value }));
    resetAndFetch({ toDate: value });
  };

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          console.log("Loading more entries...", { page, hasMore });
          loadMoreEntries();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: "100px" // Start loading 100px before reaching the bottom
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading, page]);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        resetAndFetch();
      }
    } catch (error) {
      console.error("Failed to fetch user");
    }
  };

  const resetAndFetch = (overrides?: { voucherType?: string; referenceType?: string; fromDate?: string; toDate?: string; search?: string }) => {
    setEntries([]);
    setPage(1);
    setHasMore(true);
    fetchEntries(1, true, overrides);
  };

  const fetchEntries = async (pageNum: number = 1, reset: boolean = false, overrides?: { voucherType?: string; referenceType?: string; fromDate?: string; toDate?: string; search?: string }) => {
    console.log("fetchEntries called", { pageNum, reset, currentPage: page });
    
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "50",
        fromDate: overrides?.fromDate ?? dateRange.fromDate,
        toDate: overrides?.toDate ?? dateRange.toDate,
      });

      const vType = overrides?.voucherType ?? voucherTypeFilter;
      if (vType !== "all") {
        params.append("voucherType", vType);
      }

      const rType = overrides?.referenceType ?? referenceTypeFilter;
      if (rType !== "all") {
        params.append("referenceType", rType);
      }

      const search = overrides?.search ?? searchTerm;
      if (search) {
        params.append("search", search);
      }

      console.log("Fetching with params:", params.toString());

      const res = await fetch(`/api/ledger-entries?${params.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Failed to fetch entries");
        return;
      }

      const data = await res.json();
      console.log("Received data:", {
        entriesReceived: data.entries.length,
        hasMore: data.pagination.hasMore,
        total: data.pagination.total,
        currentPage: data.pagination.page,
      });

      if (reset) {
        setEntries(data.entries);
      } else {
        setEntries((prev) => {
          const newEntries = [...prev, ...data.entries];
          console.log("Total entries after merge:", newEntries.length);
          return newEntries;
        });
      }

      setStatistics(data.statistics);
      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
      
      console.log("State updated:", { 
        page: pageNum, 
        hasMore: data.pagination.hasMore,
        totalEntriesNow: reset ? data.entries.length : entries.length + data.entries.length
      });
    } catch (error) {
      console.error("Error fetching entries:", error);
      toast.error("Failed to fetch entries");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreEntries = () => {
    console.log("loadMoreEntries called", { loadingMore, hasMore, page });
    if (!loadingMore && hasMore) {
      console.log("Fetching page:", page + 1);
      fetchEntries(page + 1, false);
    }
  };

  const handleSearch = () => {
    resetAndFetch();
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  const downloadCSV = () => {
    if (entries.length === 0) {
      toast.error("No entries to export");
      return;
    }

    const headers = [
      "Date",
      "Voucher Type",
      "Voucher #",
      "Account Code",
      "Account Name",
      "Narration",
      "Debit",
      "Credit",
      "Reference Type",
      "Reference #",
      "Created By",
    ];

    const rows = entries.map((entry) => [
      new Date(entry.date).toLocaleDateString(),
      entry.voucherType,
      entry.voucherNumber,
      entry.accountNumber,
      entry.accountName,
      entry.narration,
      entry.debit.toFixed(2),
      entry.credit.toFixed(2),
      entry.referenceType || "-",
      entry.referenceNumber || "-",
      entry.createdBy.name,
    ]);

    const csvContent = [
      "LEDGER ENTRIES REPORT",
      `Period: ${dateRange.fromDate} to ${dateRange.toDate}`,
      `Generated: ${new Date().toLocaleString()}`,
      `Total Entries: ${statistics.entriesCount}`,
      `Total Debit: QAR ${statistics.totalDebit.toFixed(2)}`,
      `Total Credit: QAR ${statistics.totalCredit.toFixed(2)}`,
      `Difference: QAR ${statistics.difference.toFixed(2)}`,
      "",
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.download = `ledger_entries_${dateRange.fromDate}_to_${dateRange.toDate}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Ledger entries exported");
  };

  const getVoucherTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "payment":
        return <TrendingDown className="h-4 w-4" />;
      case "receipt":
        return <TrendingUp className="h-4 w-4" />;
      case "journal":
        return <BookOpen className="h-4 w-4" />;
      case "contra":
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <Receipt className="h-4 w-4" />;
    }
  };

  const voucherTypes = [
    { value: "all", label: "All Types" },
    { value: "payment", label: "Payment" },
    { value: "receipt", label: "Receipt" },
    { value: "journal", label: "Journal" },
    { value: "contra", label: "Contra" },
  ];

  const referenceTypes = [
    { value: "all", label: "All References" },
    { value: "OPENING_BALANCE", label: "Opening Balance" },
    { value: "SALE", label: "Sale" },
    { value: "PURCHASE", label: "Purchase" },
    { value: "PURCHASE_PAYMENT", label: "Purchase Payment" },
    { value: "PAYMENT", label: "Payment" },
    { value: "RECEIPT", label: "Receipt" },
    { value: "ADJUSTMENT", label: "Adjustment" },
    { value: "REVERSAL", label: "Reversal" },
    { value: "MANUAL", label: "Manual" },
    { value: "TRANSFER", label: "Transfer" },
  ];

  const clearFilters = () => {
    const defaults = {
      fromDate: new Date(new Date().getFullYear(), 0, 1)
        .toISOString()
        .split("T")[0],
      toDate: new Date().toISOString().split("T")[0],
    };
    setSearchTerm("");
    setVoucherTypeFilter("all");
    setReferenceTypeFilter("all");
    setDateRange(defaults);
    resetAndFetch({ voucherType: "all", referenceType: "all", search: "", ...defaults });
  };

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505] text-white">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">
                    {statistics.entriesCount} entries
                  </span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-green-400 text-xs font-medium">
                    {statistics.totalDebit.toFixed(0)}
                  </span>
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
                <div>
                  <h1 className="text-xl font-bold text-white">
                    Ledger Entries
                  </h1>
                  <p className="text-xs text-white/60">
                    {statistics.entriesCount} entries
                  </p>
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
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search entries..."
                className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/70 text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg">
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Receipt className="h-8 w-8 text-white" />
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Ledger Entries
                  </h1>
                  <p className="text-white/80 mt-1">
                    All accounting transactions
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={downloadCSV}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all group"
                >
                  <FileDown className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => resetAndFetch()}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all group"
                >
                  <RefreshCw className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[180px] md:pt-6 pb-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-900/20 rounded-xl">
                  <Receipt className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Total Entries</p>
              <p className="text-lg md:text-2xl font-bold text-white">
                {statistics.entriesCount}
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-900/20 rounded-xl">
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-green-400" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Total Debit</p>
              <p className="text-lg md:text-2xl font-bold text-green-400 truncate">
                QAR {statistics.totalDebit.toFixed(2)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-red-900/20 rounded-xl">
                  <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-red-400" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Total Credit</p>
              <p className="text-lg md:text-2xl font-bold text-red-400 truncate">
                QAR {statistics.totalCredit.toFixed(2)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`p-2 rounded-xl ${
                    Math.abs(statistics.difference) < 0.01
                      ? "bg-green-900/20"
                      : "bg-orange-900/20"
                  }`}
                >
                  {Math.abs(statistics.difference) < 0.01 ? (
                    <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-orange-400" />
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">Difference</p>
              <p
                className={`text-lg md:text-2xl font-bold truncate ${
                  Math.abs(statistics.difference) < 0.01
                    ? "text-green-400"
                    : "text-orange-400"
                }`}
              >
                QAR {Math.abs(statistics.difference).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Desktop Filters */}
          <div className="hidden md:block bg-slate-800 border border-slate-700 rounded-2xl shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search..."
                  className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400"
                />
              </div>

              <div>
                <select
                  value={voucherTypeFilter}
                  onChange={(e) => handleVoucherTypeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  {voucherTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={referenceTypeFilter}
                  onChange={(e) => handleReferenceTypeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  {referenceTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="date"
                  value={dateRange.fromDate}
                  onChange={(e) => handleFromDateChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <input
                  type="date"
                  value={dateRange.toDate}
                  onChange={(e) => handleToDateChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSearch}
                className="flex-1 px-4 py-2 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] transition-all flex items-center justify-center gap-2"
              >
                <Search className="h-4 w-4" />
                <span>Search</span>
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white hover:bg-slate-800 transition-all"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Entries List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E84545]"></div>
            </div>
          ) : entries.length === 0 ? (
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-8 text-center">
              <Receipt className="h-12 w-12 mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400 text-lg font-medium">
                No entries found
              </p>
              <p className="text-slate-500 text-sm mt-1">
                Try adjusting your filters
              </p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden space-y-3">
                {entries.map((entry) => (
                  <div
                    key={entry._id}
                    className="bg-gradient-to-br from-[#0A0A0A] to-slate-900 border border-white/10 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-2 rounded-xl ${
                            entry.voucherType === "payment"
                              ? "bg-red-900/20"
                              : entry.voucherType === "receipt"
                              ? "bg-green-900/20"
                              : "bg-blue-900/20"
                          }`}
                        >
                          {getVoucherTypeIcon(entry.voucherType)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">
                            {entry.voucherNumber}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(entry.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {entry.isReversal && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-900/30 text-orange-400">
                          Reversal
                        </span>
                      )}
                    </div>

                    <div className="mb-3">
                      <p className="text-xs text-slate-500 mb-1">Account</p>
                      <p className="text-sm font-semibold text-white">
                        {entry.accountName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {entry.accountNumber}
                      </p>
                    </div>

                    <div className="mb-3">
                      <p className="text-xs text-slate-500 mb-1">Narration</p>
                      <p className="text-sm text-slate-300">
                        {entry.narration}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase">
                          Debit
                        </span>
                        <p className="text-sm font-semibold text-green-400">
                          {entry.debit > 0
                            ? `QAR ${entry.debit.toFixed(2)}`
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase">
                          Credit
                        </span>
                        <p className="text-sm font-semibold text-red-400">
                          {entry.credit > 0
                            ? `QAR ${entry.credit.toFixed(2)}`
                            : "-"}
                        </p>
                      </div>
                    </div>

                    {entry.referenceType && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-xs text-slate-500">
                          Reference: {entry.referenceType}
                          {entry.referenceNumber &&
                            ` - ${entry.referenceNumber}`}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
                <table className="min-w-full divide-y divide-slate-700">
                  <thead className="bg-slate-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                        Voucher
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                        Account
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                        Narration
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                        Debit
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                        Credit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                        Reference
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {entries.map((entry) => (
                      <tr
                        key={entry._id}
                        className="hover:bg-slate-700/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {new Date(entry.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${
                                entry.voucherType === "payment"
                                  ? "bg-red-900/30 text-red-400"
                                  : entry.voucherType === "receipt"
                                  ? "bg-green-900/30 text-green-400"
                                  : "bg-blue-900/30 text-blue-400"
                              }`}
                            >
                              {entry.voucherType}
                            </span>
                            <span className="text-sm font-medium text-[#E84545]">
                              {entry.voucherNumber}
                            </span>
                            {entry.isReversal && (
                              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-900/30 text-orange-400">
                                Rev
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-white">
                              {entry.accountName}
                            </p>
                            <p className="text-xs text-slate-400">
                              {entry.accountNumber}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300 max-w-xs truncate">
                          {entry.narration}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-green-400">
                          {entry.debit > 0
                            ? `QAR ${entry.debit.toFixed(2)}`
                            : "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-red-400">
                          {entry.credit > 0
                            ? `QAR ${entry.credit.toFixed(2)}`
                            : "-"}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {entry.referenceType || "-"}
                          {entry.referenceNumber && (
                            <span className="block text-[#E84545]">
                              {entry.referenceNumber}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Infinite Scroll Trigger */}
              <div ref={observerTarget} className="py-12 min-h-[100px]">
                {loadingMore && (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E84545]"></div>
                    <p className="text-sm text-slate-400">Loading more entries...</p>
                  </div>
                )}
                {!hasMore && entries.length > 0 && (
                  <div className="text-center">
                    <p className="text-slate-500 text-lg">
                      ✓ All entries loaded
                    </p>
                    <p className="text-slate-600 text-sm mt-1">
                      Showing all {entries.length} of {statistics.entriesCount} entries
                    </p>
                  </div>
                )}
                {hasMore && !loadingMore && entries.length > 0 && (
                  <div className="text-center">
                    <p className="text-slate-600 text-sm">
                      Scroll down to load more...
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-20"></div>
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
                <label htmlFor="filter-voucher-type" className="block text-sm font-medium text-gray-300 mb-2">
                  Voucher Type
                </label>
                <select
                  id="filter-voucher-type"
                  value={voucherTypeFilter}
                  onChange={(e) => handleVoucherTypeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                >
                  {voucherTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-reference-type" className="block text-sm font-medium text-gray-300 mb-2">
                  Reference Type
                </label>
                <select
                  id="filter-reference-type"
                  value={referenceTypeFilter}
                  onChange={(e) => handleReferenceTypeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                >
                  {referenceTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-from-date" className="block text-sm font-medium text-gray-300 mb-2">
                  From Date
                </label>
                <input
                  id="filter-from-date"
                  type="date"
                  value={dateRange.fromDate}
                  onChange={(e) => handleFromDateChange(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                />
              </div>

              <div>
                <label htmlFor="filter-to-date" className="block text-sm font-medium text-gray-300 mb-2">
                  To Date
                </label>
                <input
                  id="filter-to-date"
                  type="date"
                  value={dateRange.toDate}
                  onChange={(e) => handleToDateChange(e.target.value)}
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
                    setShowFilters(false);
                    handleSearch();
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
                  downloadCSV();
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Export CSV</span>
                <FileDown className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  resetAndFetch();
                  setShowMobileMenu(false);
                  toast.success("Entries refreshed");
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