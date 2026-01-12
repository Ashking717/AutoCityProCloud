// app/autocityPro/ledgers/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  BookOpen,
  Search,
  Eye,
  ArrowLeft,
  Printer,
  Filter,
  X,
  ChevronLeft,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  FileDown,
  RefreshCw,
  DollarSign,
  CreditCard,
  Receipt,
  AlertCircle,
  BarChart3,
  Calendar,
  ChevronRight,
  Filter as FilterIcon,
  Scale,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";

export default function LedgersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);

  // Trial Balance State
  const [showTrialBalance, setShowTrialBalance] = useState(false);
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null);
  const [loadingTrialBalance, setLoadingTrialBalance] = useState(false);
  const [tbDateRange, setTbDateRange] = useState({
    fromDate: new Date(new Date().getFullYear(), 0, 1)
      .toISOString()
      .split("T")[0],
    toDate: new Date().toISOString().split("T")[0],
  });

  // Ledger detail view
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(new Date().getFullYear(), 0, 1)
      .toISOString()
      .split("T")[0],
    toDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchUser();
    fetchAccounts();

    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => window.removeEventListener("resize", checkIfMobile);
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

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/accounts", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error("Failed to fetch accounts");
      toast.error("Failed to fetch accounts");
    } finally {
      setLoading(false);
    }
  };

  const fetchTrialBalance = async () => {
    if (!user?.outletId) {
      toast.error("Outlet not found");
      return;
    }

    setLoadingTrialBalance(true);
    try {
      const res = await fetch(
        `/api/accounts/trial-balance?outletId=${user.outletId}&fromDate=${tbDateRange.fromDate}&toDate=${tbDateRange.toDate}`,
        { credentials: "include" }
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to fetch trial balance");
        return;
      }

      setTrialBalanceData(data);
      toast.success("Trial balance generated");
    } catch (err) {
      toast.error("Failed to fetch trial balance");
    } finally {
      setLoadingTrialBalance(false);
    }
  };

  const fetchLedger = async (accountId: string) => {
    setLoadingLedger(true);
    try {
      const res = await fetch(
        `/api/ledgers/${accountId}?fromDate=${dateRange.fromDate}&toDate=${dateRange.toDate}`,
        { credentials: "include" }
      );

      if (res.ok) {
        const data = await res.json();
        setLedgerData(data);
        toast.success("Ledger loaded successfully");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to fetch ledger");
      }
    } catch (error) {
      console.error("Error fetching ledger:", error);
      toast.error("Failed to fetch ledger");
    } finally {
      setLoadingLedger(false);
    }
  };

  const downloadTrialBalanceCSV = () => {
    if (!trialBalanceData?.accounts?.length) {
      toast.error("No trial balance data to export");
      return;
    }

    const periodFrom = tbDateRange.fromDate;
    const periodTo = tbDateRange.toDate;
    const generatedOn = new Date().toLocaleString();

    const headers = [
      "Account Code",
      "Account Name",
      "Account Type",
      "Opening Balance",
      "Debit",
      "Credit",
      "Closing Balance",
    ];

    const rows = trialBalanceData.accounts.map((acc: any) => [
      acc.accountCode,
      acc.accountName,
      acc.accountType,
      acc.openingBalance.toFixed(2),
      acc.periodDebit.toFixed(2),
      acc.periodCredit.toFixed(2),
      acc.closingBalance.toFixed(2),
    ]);

    interface TrialBalanceAccount {
      accountCode: string;
      accountName: string;
      accountType: string;
      openingBalance: number;
      periodDebit: number;
      periodCredit: number;
      closingBalance: number;
    }

    interface TrialBalanceTotals {
      totalDebit: number;
      totalCredit: number;
      isBalanced: boolean;
      difference?: number;
    }

    interface TrialBalanceData {
      outletId: string;
      accounts: TrialBalanceAccount[];
      totals: TrialBalanceTotals;
    }

    interface TrialBalanceReport {
      outletName: string;
      period: {
        from: string;
        to: string;
      };
      generatedAt: string;
    }

    interface TrialBalanceAccount {
      accountCode: string;
      accountName: string;
      accountType: string;
      openingBalance: number;
      periodDebit: number;
      periodCredit: number;
      closingBalance: number;
    }

    interface TrialBalanceTotals {
      totalDebit: number;
      totalCredit: number;
      isBalanced: boolean;
      difference?: number;
    }

    interface TrialBalanceData {
      outletId: string;
      report: TrialBalanceReport;
      accounts: TrialBalanceAccount[];
      totals: TrialBalanceTotals;
    }

    const csvContent: string = [
      "TRIAL BALANCE",
      `Outlet: ${(trialBalanceData as TrialBalanceData).report.outletName}`,
      `Period: ${
        (trialBalanceData as TrialBalanceData).report.period.from
      } to ${(trialBalanceData as TrialBalanceData).report.period.to}`,
      `Generated On: ${new Date(
        (trialBalanceData as TrialBalanceData).report.generatedAt
      ).toLocaleString()}`,
      "",
      headers.join(","),
      ...rows.map((row: string[]) => row.join(",")),
      "",
      `TOTALS,,,${(trialBalanceData as TrialBalanceData).totals.totalDebit},${
        (trialBalanceData as TrialBalanceData).totals.totalCredit
      }`,
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.download = `trial_balance_${periodFrom}_to_${periodTo}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Trial Balance exported with period");
  };

  const handleViewLedger = (account: any) => {
    setSelectedAccount(account);
    setShowTrialBalance(false);
    fetchLedger(account._id);
  };

  const handleBack = () => {
    setSelectedAccount(null);
    setLedgerData(null);
    setShowTrialBalance(false);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };
  const formatBalanceWithDrCr = (value: number, accountType: string) => {
    const abs = Math.abs(value).toFixed(2);
    const type = accountType.toLowerCase();

    const isDebitNormal = ["asset", "expense"].includes(type);

    if (isDebitNormal) {
      return value >= 0 ? `${abs} Dr` : `${abs} Cr`;
    } else {
      return value >= 0 ? `${abs} Cr` : `${abs} Dr`;
    }
  };

  const downloadLedgerCSV = () => {
    if (!ledgerData?.ledgerEntries || ledgerData.ledgerEntries.length === 0) {
      toast.error("No ledger data to export");
      return;
    }

    const headers = [
      "Date",
      "Voucher Type",
      "Voucher #",
      "Narration",
      "Debit",
      "Credit",
      "Balance",
    ];
    const rows = ledgerData.ledgerEntries.map((entry: any) => [
      new Date(entry.date).toLocaleDateString(),
      entry.voucherType,
      entry.voucherNumber,
      entry.narration,
      entry.debit,
      entry.credit,
      entry.balance,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row: (string | number)[]) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `ledger_${selectedAccount?.accountName || "account"}_${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${ledgerData.ledgerEntries.length} entries to CSV`);
  };

  const downloadAccountsCSV = () => {
    if (filteredAccounts.length === 0) {
      toast.error("No accounts to export");
      return;
    }

    const headers = [
      "Account Name",
      "Account Number",
      "Type",
      "Group",
      "Opening Balance",
      "Current Balance",
    ];
    const rows = filteredAccounts.map((acc) => [
      acc.accountName || acc.name || "",
      acc.accountNumber || acc.code || "",
      acc.accountType || acc.type || "",
      acc.accountGroup || acc.group || "",
      acc.openingBalance || 0,
      acc.currentBalance || 0,
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
      `accounts_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredAccounts.length} accounts to CSV`);
  };

  const filteredAccounts = accounts.filter((acc) => {
    const accountName = acc.accountName || acc.name || "";
    const accountNumber = acc.accountNumber || acc.code || "";

    const matchesSearch =
      accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      accountNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const accountType = (acc.accountType || acc.type || "").toLowerCase();
    const matchesType = filterType === "all" || accountType === filterType;

    return matchesSearch && matchesType;
  });

  const accountTypes = [
    { value: "all", label: "All Types", color: "bg-gray-500" },
    { value: "asset", label: "Assets", color: "bg-green-500" },
    { value: "liability", label: "Liabilities", color: "bg-red-500" },
    { value: "equity", label: "Equity", color: "bg-purple-500" },
    { value: "revenue", label: "Revenue", color: "bg-blue-500" },
    { value: "expense", label: "Expenses", color: "bg-orange-500" },
  ];

  const getAccountTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "asset":
        return <TrendingUp className="h-4 w-4" />;
      case "liability":
        return <TrendingDown className="h-4 w-4" />;
      case "revenue":
        return <DollarSign className="h-4 w-4" />;
      case "expense":
        return <CreditCard className="h-4 w-4" />;
      case "equity":
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const clearFilters = () => {
    setFilterType("all");
    setSearchTerm("");
  };

  // Trial Balance View
  if (showTrialBalance) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="min-h-screen bg-[#050505] text-white">
          {/* Mobile Header */}
          <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBack}
                    className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h1 className="text-xl font-bold text-white">
                      Trial Balance
                    </h1>
                    <p className="text-xs text-white/60">
                      {trialBalanceData?.accounts?.length || 0} accounts
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadTrialBalanceCSV}
                    className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                  >
                    <FileDown className="h-4 w-4" />
                  </button>
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
                    onClick={handleBack}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                  >
                    <ArrowLeft className="h-5 w-5 text-white" />
                  </button>
                  <div className="flex items-center gap-3">
                    <Scale className="h-8 w-8 text-white" />
                    <div>
                      <h1 className="text-3xl font-bold text-white">
                        Trial Balance
                      </h1>
                      <p className="text-white/80 mt-1">
                        Verify accounting accuracy
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={downloadTrialBalanceCSV}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all group"
                  >
                    <FileDown className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 md:px-8 pt-[80px] md:pt-6 pb-6">
            {/* Date Range Filter */}
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 md:p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={tbDateRange.fromDate}
                    onChange={(e) =>
                      setTbDateRange({
                        ...tbDateRange,
                        fromDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={tbDateRange.toDate}
                    onChange={(e) =>
                      setTbDateRange({ ...tbDateRange, toDate: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div className="md:col-span-2 flex items-end">
                  <button
                    onClick={fetchTrialBalance}
                    disabled={loadingTrialBalance}
                    className="w-full px-4 py-2.5 bg-[#E84545] text-white font-semibold rounded-lg hover:bg-[#cc3c3c] disabled:bg-slate-700 disabled:text-slate-400 transition-all flex items-center justify-center gap-2"
                  >
                    {loadingTrialBalance ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        <span>Generate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {loadingTrialBalance ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E84545]"></div>
              </div>
            ) : trialBalanceData ? (
              <>
                {/* Balance Status Card */}
                <div
                  className={`mb-6 p-6 rounded-2xl border-2 ${
                    trialBalanceData.totals.isBalanced
                      ? "bg-green-900/20 border-green-500/50"
                      : "bg-red-900/20 border-red-500/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {trialBalanceData.totals.isBalanced ? (
                      <CheckCircle className="h-8 w-8 text-green-400" />
                    ) : (
                      <AlertCircle className="h-8 w-8 text-red-400" />
                    )}
                    <div className="flex-1">
                      <h3
                        className={`text-xl font-bold ${
                          trialBalanceData.totals.isBalanced
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {trialBalanceData.totals.isBalanced
                          ? "Books are Balanced"
                          : "Books are Unbalanced"}
                      </h3>
                      <p className="text-sm text-white/70 mt-1">
                        {trialBalanceData.totals.isBalanced
                          ? "Total debits equal total credits"
                          : `Difference: QAR ${
                              trialBalanceData.totals.difference?.toFixed(2) ||
                              "0.00"
                            }`}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-white/60">Total Debit</div>
                      <div className="text-xl font-bold text-red-400">
                        QAR{" "}
                        {trialBalanceData.totals.totalDebit?.toFixed(2) ||
                          "0.00"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-white/60">Total Credit</div>
                      <div className="text-xl font-bold text-green-400">
                        QAR{" "}
                        {trialBalanceData.totals.totalCredit?.toFixed(2) ||
                          "0.00"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                  {trialBalanceData.accounts.map((acc: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-gradient-to-br from-[#0A0A0A] to-slate-900 border border-white/10 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getAccountTypeIcon(acc.accountType)}
                          <div>
                            <h3 className="text-sm font-bold text-white">
                              {acc.accountName}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {acc.accountCode}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                            acc.accountType === "asset"
                              ? "bg-green-900/30 text-green-400"
                              : acc.accountType === "liability"
                              ? "bg-red-900/30 text-red-400"
                              : acc.accountType === "equity"
                              ? "bg-purple-900/30 text-purple-400"
                              : acc.accountType === "revenue"
                              ? "bg-blue-900/30 text-blue-400"
                              : "bg-orange-900/30 text-orange-400"
                          }`}
                        >
                          {acc.accountType}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block mb-1">
                            Opening
                          </span>
                          <p className="text-sm font-semibold text-white">
                            QAR {acc.openingBalance?.toFixed(2) || "0.00"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block mb-1">
                            Closing
                          </span>
                          <p className="text-sm font-semibold text-white">
                            QAR {acc.closingBalance?.toFixed(2) || "0.00"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block mb-1">
                            Debit
                          </span>
                          <p className="text-sm font-semibold text-red-400">
                            QAR {acc.periodDebit?.toFixed(2) || "0.00"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block mb-1">
                            Credit
                          </span>
                          <p className="text-sm font-semibold text-green-400">
                            QAR {acc.periodCredit?.toFixed(2) || "0.00"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-700">
                    <thead className="bg-slate-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                          Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                          Account Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                          Type
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                          Opening
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                          Debit
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                          Credit
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                          Closing
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {trialBalanceData.accounts.map(
                        (acc: any, idx: number) => (
                          <tr
                            key={idx}
                            className="hover:bg-slate-700/50 transition-colors"
                          >
                            <td className="px-6 py-4 text-sm text-slate-300 font-medium">
                              {acc.accountCode}
                            </td>
                            <td className="px-6 py-4 text-sm text-white font-medium">
                              {acc.accountName}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-3 py-1 inline-flex items-center gap-2 text-xs font-semibold rounded-full capitalize ${
                                  acc.accountType === "asset"
                                    ? "bg-green-900/30 text-green-400"
                                    : acc.accountType === "liability"
                                    ? "bg-red-900/30 text-red-400"
                                    : acc.accountType === "equity"
                                    ? "bg-purple-900/30 text-purple-400"
                                    : acc.accountType === "revenue"
                                    ? "bg-blue-900/30 text-blue-400"
                                    : "bg-orange-900/30 text-orange-400"
                                }`}
                              >
                                {getAccountTypeIcon(acc.accountType)}
                                {acc.accountType}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-right text-white">
                              QAR {acc.openingBalance?.toFixed(2) || "0.00"}
                            </td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-red-400">
                              QAR {acc.periodDebit?.toFixed(2) || "0.00"}
                            </td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-green-400">
                              QAR {acc.periodCredit?.toFixed(2) || "0.00"}
                            </td>
                            <td className="px-6 py-4 text-sm text-right font-bold text-white">
                              QAR {acc.closingBalance?.toFixed(2) || "0.00"}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                    <tfoot className="bg-slate-900 font-bold">
                      <tr className="border-t-2 border-slate-600">
                        <td
                          colSpan={4}
                          className="px-6 py-4 text-sm text-right text-white"
                        >
                          TOTALS
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-red-400">
                          QAR{" "}
                          {trialBalanceData.totals.totalDebit?.toFixed(2) ||
                            "0.00"}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-green-400">
                          QAR{" "}
                          {trialBalanceData.totals.totalCredit?.toFixed(2) ||
                            "0.00"}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-white">
                          QAR{" "}
                          {trialBalanceData.accounts
                            .reduce(
                              (sum: number, acc: any) =>
                                sum + (acc.closingBalance || 0),
                              0
                            )
                            .toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Scale className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400 text-lg">
                  Click "Generate" to view trial balance
                </p>
              </div>
            )}
          </div>
        </div>
      </MainLayout>
    );
  }

  // Ledger Detail View
  if (selectedAccount) {
    const accountName =
      selectedAccount.accountName || selectedAccount.name || "Account";
    const accountNumber =
      selectedAccount.accountNumber || selectedAccount.code || "";
    const accountType = (
      selectedAccount.accountType ||
      selectedAccount.type ||
      ""
    ).toLowerCase();

    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="min-h-screen bg-[#050505]">
          {/* Dynamic Island - Mobile Only */}
          {isMobile && showDynamicIsland && (
            <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
              <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-3 w-3 text-[#E84545]" />
                    <span className="text-white text-xs font-semibold">
                      {accountName.substring(0, 12)}
                    </span>
                  </div>
                  <div className="h-3 w-px bg-white/20"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-xs font-medium">
                      {accountNumber}
                    </span>
                  </div>
                  <div className="h-3 w-px bg-white/20"></div>
                  <div className="flex items-center gap-1">
                    {getAccountTypeIcon(accountType)}
                    <span className="text-[#E84545] text-xs font-medium capitalize">
                      {accountType}
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
                    onClick={handleBack}
                    className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h1 className="text-xl font-bold text-white">
                      {accountName.substring(0, 20)}
                    </h1>
                    <p className="text-xs text-white/60">{accountNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadLedgerCSV}
                    className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                  >
                    <FileDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowMobileMenu(true)}
                    className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
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
                    onClick={handleBack}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                  >
                    <ArrowLeft className="h-5 w-5 text-white" />
                  </button>
                  <div>
                    <h1 className="text-3xl font-bold text-white">
                      {accountName}
                    </h1>
                    <p className="text-white/80 mt-1">
                      {accountNumber} • {accountType}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={downloadLedgerCSV}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all group"
                  >
                    <FileDown className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all group"
                  >
                    <Printer className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span>Print</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 md:px-8 pt-[180px] md:pt-6 pb-6">
            {/* Date Filter - Mobile */}
            <div className="md:hidden bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#E84545]" />
                  <span className="text-white text-sm font-semibold">
                    Date Range
                  </span>
                </div>
                <button
                  onClick={() => fetchLedger(selectedAccount._id)}
                  disabled={loadingLedger}
                  className="px-3 py-1.5 bg-[#E84545] text-white text-sm font-semibold rounded-lg hover:bg-[#cc3c3c] active:scale-95 transition-all"
                >
                  {loadingLedger ? "..." : "Apply"}
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.fromDate}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, fromDate: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.toDate}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, toDate: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Date Filter - Desktop */}
            <div className="hidden md:block bg-slate-800 border border-slate-700 rounded-lg shadow p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.fromDate}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, fromDate: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.toDate}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, toDate: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div className="md:col-span-2 flex items-end">
                  <button
                    onClick={() => fetchLedger(selectedAccount._id)}
                    disabled={loadingLedger}
                    className="w-full px-4 py-2.5 bg-[#E84545] text-white font-semibold rounded-lg hover:bg-[#cc3c3c] disabled:bg-slate-700 disabled:text-slate-400 transition-all flex items-center justify-center gap-2"
                  >
                    {loadingLedger ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        <span>Apply & Refresh</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {loadingLedger ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E84545]"></div>
              </div>
            ) : ledgerData ? (
              <>
                {/* Summary Cards - Mobile */}
                <div className="md:hidden grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-green-900/20 rounded-xl">
                        <DollarSign className="h-4 w-4 text-green-400" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-1">Opening</p>
                    <p className="text-lg font-bold text-white truncate">
                      QAR{" "}
                      {ledgerData.summary.openingBalance?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-red-900/20 rounded-xl">
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-1">Total Debit</p>
                    <p className="text-lg font-bold text-red-400 truncate">
                      QAR {ledgerData.summary.totalDebit?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-green-900/20 rounded-xl">
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-1">Total Credit</p>
                    <p className="text-lg font-bold text-green-400 truncate">
                      QAR {ledgerData.summary.totalCredit?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-blue-900/20 rounded-xl">
                        <BarChart3 className="h-4 w-4 text-blue-400" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-1">Closing</p>
                    <p
                      className={`text-lg font-bold ${
                        ledgerData.summary.closingBalance >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      } truncate`}
                    >
                      QAR{" "}
                      {Math.abs(ledgerData.summary.closingBalance || 0).toFixed(
                        2
                      )}
                    </p>
                  </div>
                </div>

                {/* Summary - Desktop */}
                <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-[#E84545]/30 transition-all">
                    <p className="text-sm text-slate-400">Opening Balance</p>
                    <p className="text-2xl font-bold text-white">
                      QAR{" "}
                      {ledgerData.summary.openingBalance?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-[#E84545]/30 transition-all">
                    <p className="text-sm text-slate-400">Total Debit</p>
                    <p className="text-2xl font-bold text-red-400">
                      QAR {ledgerData.summary.totalDebit?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-[#E84545]/30 transition-all">
                    <p className="text-sm text-slate-400">Total Credit</p>
                    <p className="text-2xl font-bold text-green-400">
                      QAR {ledgerData.summary.totalCredit?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-[#E84545]/30 transition-all">
                    <p className="text-sm text-slate-400">Closing Balance</p>
                    <p
                      className={`text-2xl font-bold ${
                        ledgerData.summary.closingBalance >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      QAR{" "}
                      {Math.abs(ledgerData.summary.closingBalance || 0).toFixed(
                        2
                      )}
                    </p>
                  </div>
                </div>

                {/* Ledger Entries - Mobile */}
                <div className="md:hidden">
                  {ledgerData.ledgerEntries.length === 0 ? (
                    <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl p-8 text-center">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                      <p className="text-slate-400 text-lg font-medium">
                        No transactions found
                      </p>
                      <p className="text-slate-500 text-sm mt-1">
                        Try adjusting the date range
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ledgerData.ledgerEntries.map(
                        (entry: any, index: number) => (
                          <div
                            key={entry._id || index}
                            className="bg-gradient-to-br from-[#0A0A0A] to-slate-900 border border-white/10 rounded-xl p-4 hover:border-[#E84545]/30 transition-all"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                                  entry.voucherType === "payment"
                                    ? "bg-red-900/30 text-red-400"
                                    : entry.voucherType === "receipt"
                                    ? "bg-green-900/30 text-green-400"
                                    : "bg-blue-900/30 text-blue-400"
                                }`}
                              >
                                {entry.voucherType}
                              </span>
                              <span className="text-xs text-slate-500">
                                {new Date(entry.date).toLocaleDateString()}
                              </span>
                            </div>

                            <p className="text-sm font-semibold text-white">
                              {entry.voucherNumber}
                            </p>
                            <p className="text-xs text-slate-400 mb-3">
                              {entry.narration}
                            </p>

                            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5">
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
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase">
                                  Balance
                                </span>
                                <p className="text-sm font-bold text-white">
                                  QAR{" "}
                                  {formatBalanceWithDrCr(
                                    entry.balance || 0,
                                    accountType
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Ledger Entries - Desktop */}
                <div className="hidden md:block bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-700">
                    <thead className="bg-slate-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                          Voucher #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                          Narration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                          Dr.
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                          Cr.
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                          Balance
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-700">
                      {ledgerData.ledgerEntries.map(
                        (entry: any, index: number) => (
                          <tr
                            key={entry._id || index}
                            className="hover:bg-slate-700/50"
                          >
                            <td className="px-6 py-4 text-sm text-slate-300">
                              {new Date(entry.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-3 py-1.5 text-xs font-semibold rounded-full capitalize ${
                                  entry.voucherType === "payment"
                                    ? "bg-red-900/30 text-red-400"
                                    : entry.voucherType === "receipt"
                                    ? "bg-green-900/30 text-green-400"
                                    : "bg-blue-900/30 text-blue-400"
                                }`}
                              >
                                {entry.voucherType}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-[#E84545]">
                              {entry.voucherNumber}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-300">
                              {entry.narration}
                            </td>
                            <td className="px-6 py-4 text-sm text-green-400">
                              {entry.debit > 0
                                ? `QAR ${entry.debit.toFixed(2)}`
                                : "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-red-400">
                              {entry.credit > 0
                                ? `QAR ${entry.credit.toFixed(2)}`
                                : "-"}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-white">
                              QAR{" "}
                              {formatBalanceWithDrCr(
                                entry.balance || 0,
                                accountType
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>

                    <tfoot className="bg-slate-900 font-bold">
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-4 text-right text-slate-300"
                        >
                          TOTAL
                        </td>
                        <td className="px-6 py-4 text-green-400">
                          QAR {ledgerData.summary.totalDebit.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-red-400">
                          QAR {ledgerData.summary.totalCredit.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-white">
                          QAR{" "}
                          {formatBalanceWithDrCr(
                            ledgerData.summary.closingBalance,
                            accountType
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            ) : null}
          </div>

          {/* Mobile Safe Area Bottom Padding */}
          <div className="md:hidden h-6"></div>
        </div>

        {/* Mobile Action Menu for Ledger View */}
        {showMobileMenu && selectedAccount && (
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
                    downloadLedgerCSV();
                    setShowMobileMenu(false);
                  }}
                  className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
                >
                  <span>Export CSV</span>
                  <FileDown className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    window.print();
                    setShowMobileMenu(false);
                  }}
                  className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
                >
                  <span>Print</span>
                  <Printer className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    fetchLedger(selectedAccount._id);
                    setShowMobileMenu(false);
                    toast.success("Ledger refreshed");
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

  // Account List View
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">
                    {filteredAccounts.length} accounts
                  </span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-xs font-medium">
                    {filterType === "all"
                      ? "All Types"
                      : accountTypes.find((t) => t.value === filterType)?.label}
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
                <div>
                  <h1 className="text-xl font-bold text-white">Ledgers</h1>
                  <p className="text-xs text-white/60">
                    {filteredAccounts.length} accounts
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(true)}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <FilterIcon className="h-4 w-4" />
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
                placeholder="Search accounts..."
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
                <BookOpen className="h-8 w-8 text-white" />
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Account Ledgers
                  </h1>
                  <p className="text-white/80 mt-1">
                    View and analyze account transactions
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowTrialBalance(true);
                    fetchTrialBalance();
                  }}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all group"
                >
                  <Scale className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Trial Balance</span>
                </button>
                <button
                  onClick={downloadAccountsCSV}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all group"
                >
                  <FileDown className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => router.push("/autocityPro/accounts")}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] transition-all group"
                >
                  <span>Manage Accounts</span>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[180px] md:pt-6 pb-6">
          {/* Desktop Filters */}
          <div className="hidden md:block bg-slate-800 border border-slate-700 rounded-lg shadow p-3 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by account name or code..."
                  className="w-full pl-8 pr-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white placeholder-slate-400"
                />
              </div>

              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-white appearance-none"
                >
                  {accountTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 top-2.5 pointer-events-none">
                  <Filter className="h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={clearFilters}
                  className="flex-1 px-4 py-2 text-sm bg-slate-900 border border-slate-700 rounded hover:bg-slate-800 transition-colors text-white"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => {
                    setShowTrialBalance(true);
                    fetchTrialBalance();
                  }}
                  className="flex-1 px-4 py-2 text-sm bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] transition-all flex items-center justify-center gap-2"
                >
                  <Scale className="h-4 w-4" />
                  <span>Trial Balance</span>
                </button>
              </div>
            </div>
          </div>

          {/* Accounts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {loading ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E84545] mx-auto"></div>
                <p className="text-slate-400 mt-4">Loading accounts...</p>
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400 text-lg font-medium">
                  No accounts found
                </p>
              </div>
            ) : (
              filteredAccounts.map((account) => {
                const accountName =
                  account.accountName || account.name || "Unnamed Account";
                const accountNumber =
                  account.accountNumber || account.code || "N/A";
                const accountType = (
                  account.accountType ||
                  account.type ||
                  "asset"
                ).toLowerCase();
                const accountGroup =
                  account.accountGroup || account.group || "-";
                const openingBalance = account.openingBalance || 0;
                const currentBalance = account.currentBalance || 0;

                return (
                  <div
                    key={account._id}
                    className="bg-gradient-to-br from-[#0A0A0A] to-slate-900 border border-white/10 rounded-2xl p-4 md:p-6 hover:border-[#E84545]/30 transition-all active:scale-[0.98]"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className={`p-2 rounded-xl ${
                            accountType === "asset"
                              ? "bg-green-900/20"
                              : accountType === "liability"
                              ? "bg-red-900/20"
                              : accountType === "equity"
                              ? "bg-purple-900/20"
                              : accountType === "revenue"
                              ? "bg-blue-900/20"
                              : "bg-orange-900/20"
                          }`}
                        >
                          {getAccountTypeIcon(accountType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base md:text-lg font-bold text-white truncate">
                            {accountName}
                          </h3>
                          <p className="text-xs md:text-sm text-slate-500 mt-1 truncate">
                            {accountNumber}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 md:px-3 py-1 text-xs font-semibold rounded-full ${
                          accountType === "asset"
                            ? "bg-green-900/30 text-green-400 border border-green-800/50"
                            : accountType === "liability"
                            ? "bg-red-900/30 text-red-400 border border-red-800/50"
                            : accountType === "equity"
                            ? "bg-purple-900/30 text-purple-400 border border-purple-800/50"
                            : accountType === "revenue"
                            ? "bg-blue-900/30 text-blue-400 border border-blue-800/50"
                            : "bg-orange-900/30 text-orange-400 border border-orange-800/50"
                        }`}
                      >
                        {accountType}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4 md:mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Group:</span>
                        <span className="font-medium text-slate-300">
                          {accountGroup}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Opening Balance:</span>
                        <span className="font-semibold text-slate-300">
                          QAR {openingBalance.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Current Balance:</span>
                        <span
                          className={`font-bold ${
                            currentBalance >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          QAR {currentBalance.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewLedger(account)}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] transition-all group active:scale-95"
                    >
                      <Eye className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      <span>View Ledger</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-6"></div>
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Account Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-lg text-white"
                >
                  {accountTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
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
                  onClick={() => setShowFilters(false)}
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
      {showMobileMenu && !selectedAccount && (
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
                  setShowTrialBalance(true);
                  setShowMobileMenu(false);
                  fetchTrialBalance();
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Trial Balance</span>
                <Scale className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  downloadAccountsCSV();
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Export CSV</span>
                <FileDown className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  router.push("/autocityPro/accounts");
                  setShowMobileMenu(false);
                }}
                className="w-full p-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-95"
              >
                <span>Manage Accounts</span>
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  fetchAccounts();
                  setShowMobileMenu(false);
                  toast.success("Accounts refreshed");
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
