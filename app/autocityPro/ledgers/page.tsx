"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  BookOpen, Search, Filter, ChevronLeft, RefreshCw, FileDown,
  X, Sun, Moon, TrendingUp, TrendingDown, ArrowLeftRight,
  BarChart3, Calendar, Eye,
} from "lucide-react";
import toast from "react-hot-toast";

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

interface IAccount {
  _id: string; code: string; name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  subType?: string; group?: string; openingBalance: number; currentBalance: number;
  isSystem?: boolean;
}
interface ILedgerEntry {
  _id: string; date: string; type: string; voucherNumber: string;
  narration: string; debit: number; credit: number; balance: number;
}

export default function LedgersPage() {
  const router = useRouter();
  const isDark = useTimeBasedTheme();

  const [user, setUser] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [view, setView] = useState<"accounts" | "ledger" | "trialBalance">("accounts");
  const [loading, setLoading] = useState(false);

  // Accounts list
  const [accounts, setAccounts] = useState<IAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<IAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Ledger detail
  const [selectedAccount, setSelectedAccount] = useState<IAccount | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<ILedgerEntry[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [ledgerSummary, setLedgerSummary] = useState({ opening: 0, totalDebit: 0, totalCredit: 0, closing: 0 });

  // Trial balance
  const [trialBalance, setTrialBalance] = useState<any[]>([]);
  const [tbDateRange, setTbDateRange] = useState({ fromDate: "", toDate: "" });
  const [tbBalanced, setTbBalanced] = useState(true);

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    pageBg:             isDark ? "#050505"                                               : "#f3f4f6",
    headerBgFrom:       isDark ? "#932222"                                               : "#fef2f2",
    headerBgVia:        isDark ? "#411010"                                               : "#fee2e2",
    headerBgTo:         isDark ? "#a20c0c"                                               : "#fecaca",
    headerBorder:       isDark ? "rgba(255,255,255,0.05)"                                : "rgba(0,0,0,0.06)",
    headerTitle:        isDark ? "#ffffff"                                               : "#7f1d1d",
    headerSub:          isDark ? "rgba(255,255,255,0.80)"                                : "#991b1b",
    headerBtnBg:        isDark ? "#ffffff"                                               : "#7f1d1d",
    headerBtnText:      isDark ? "#E84545"                                               : "#ffffff",
    mobileHeaderBg:     isDark ? "linear-gradient(135deg,#0A0A0A,#050505,#0A0A0A)"      : "linear-gradient(135deg,#ffffff,#f9fafb,#ffffff)",
    mobileHeaderBorder: isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.08)",
    mobileHeaderTitle:  isDark ? "#ffffff"                                               : "#111827",
    mobileHeaderSub:    isDark ? "rgba(255,255,255,0.60)"                                : "#6b7280",
    mobileBtnBg:        isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.05)",
    mobileBtnText:      isDark ? "rgba(255,255,255,0.80)"                               : "#374151",
    mobileSearchBg:     isDark ? "rgba(255,255,255,0.08)"                               : "#ffffff",
    mobileSearchBorder: isDark ? "rgba(255,255,255,0.12)"                               : "rgba(0,0,0,0.12)",
    mobileSearchText:   isDark ? "#ffffff"                                               : "#111827",
    filterPanelBg:      isDark ? "#0A0A0A"                                               : "#ffffff",
    filterPanelBorder:  isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.08)",
    filterInputBg:      isDark ? "#111111"                                               : "#ffffff",
    filterInputBorder:  isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.10)",
    filterInputText:    isDark ? "#ffffff"                                               : "#111827",
    filterIcon:         isDark ? "#6b7280"                                               : "#9ca3af",
    cardBg:             isDark ? "#0A0A0A"                                               : "#ffffff",
    cardBorder:         isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.08)",
    cardHoverBorder:    isDark ? "rgba(232,69,69,0.30)"                                  : "rgba(232,69,69,0.40)",
    cardTitle:          isDark ? "#ffffff"                                               : "#111827",
    cardSubtext:        isDark ? "#9ca3af"                                               : "#6b7280",
    cardMuted:          isDark ? "#6b7280"                                               : "#9ca3af",
    innerBg:            isDark ? "#111111"                                               : "#f3f4f6",
    innerBorder:        isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.08)",
    summaryCardBg:      isDark ? "#111111"                                               : "#f9fafb",
    summaryCardBorder:  isDark ? "rgba(255,255,255,0.08)"                               : "rgba(0,0,0,0.08)",
    tableHeaderBg:      isDark ? "#111111"                                               : "#f9fafb",
    tableHeaderText:    isDark ? "#9ca3af"                                               : "#6b7280",
    tableRowHover:      isDark ? "rgba(255,255,255,0.02)"                               : "rgba(0,0,0,0.02)",
    tableBorder:        isDark ? "rgba(255,255,255,0.04)"                               : "rgba(0,0,0,0.06)",
    actionBtnBg:        isDark ? "#111111"                                               : "#f3f4f6",
    actionBtnBorder:    isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.08)",
    actionBtnText:      isDark ? "#9ca3af"                                               : "#6b7280",
    emptyIcon:          isDark ? "#374151"                                               : "#d1d5db",
    emptyText:          isDark ? "#9ca3af"                                               : "#6b7280",
    modalBg:            isDark ? "linear-gradient(180deg,#0A0A0A,#050505)"              : "linear-gradient(180deg,#ffffff,#f9fafb)",
    modalBorder:        isDark ? "rgba(255,255,255,0.10)"                               : "rgba(0,0,0,0.08)",
    modalTitle:         isDark ? "#ffffff"                                               : "#111827",
    modalCloseBg:       isDark ? "rgba(255,255,255,0.05)"                               : "rgba(0,0,0,0.05)",
    modalCloseText:     isDark ? "#9ca3af"                                               : "#6b7280",
    modalSelectBg:      isDark ? "#111111"                                               : "#ffffff",
    modalSelectBorder:  isDark ? "rgba(255,255,255,0.10)"                               : "rgba(0,0,0,0.10)",
    modalSelectText:    isDark ? "#ffffff"                                               : "#111827",
    modalLabel:         isDark ? "#d1d5db"                                               : "#374151",
  };

  const selectStyle = { background: th.filterInputBg, border: `1px solid ${th.filterInputBorder}`, color: th.filterInputText };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  useEffect(() => { fetchUser(); fetchAccounts(); }, []);
  useEffect(() => { filterAccounts(); }, [accounts, searchTerm, typeFilter]);

  const fetchUser = async () => {
    try { const r = await fetch("/api/auth/me", { credentials: "include" }); if (r.ok) { const d = await r.json(); setUser(d.user); } } catch {}
  };
  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/accounts", { credentials: "include" });
      if (r.ok) { const d = await r.json(); setAccounts(d.accounts || []); }
    } catch { toast.error("Failed to load accounts"); }
    finally { setLoading(false); }
  };
  const filterAccounts = () => {
    let f = accounts;
    if (typeFilter !== "all") f = f.filter(a => a.type === typeFilter);
    if (searchTerm) { const t = searchTerm.toLowerCase(); f = f.filter(a => a.name.toLowerCase().includes(t) || a.code.toLowerCase().includes(t)); }
    setFilteredAccounts(f);
  };

  const fetchLedger = async (account: IAccount) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append("fromDate", fromDate);
      if (toDate) params.append("toDate", toDate);
      const r = await fetch(`/api/ledgers/${account._id}?${params}`, { credentials: "include" });
      if (r.ok) {
        const d = await r.json();
        setLedgerEntries(d.ledgerEntries || []);
setLedgerSummary({
  opening:     d.summary?.openingBalance  ?? 0,
  totalDebit:  d.summary?.totalDebit      ?? 0,
  totalCredit: d.summary?.totalCredit     ?? 0,
  closing:     d.summary?.closingBalance  ?? 0,
});
      }
    } catch { toast.error("Failed to load ledger"); }
    finally { setLoading(false); }
  };

  const fetchTrialBalance = async () => {
  setLoading(true);
  try {
    const params = new URLSearchParams();
    if (user?.outletId) params.append("outletId", user.outletId); // ← add this
    if (tbDateRange.fromDate) params.append("fromDate", tbDateRange.fromDate);
    if (tbDateRange.toDate) params.append("toDate", tbDateRange.toDate);
    const r = await fetch(`/api/accounts/trial-balance?${params}`, { credentials: "include" });
    if (r.ok) {
      const d = await r.json();
      setTrialBalance(d.accounts || []);
      setTbBalanced(d.totals?.isBalanced ?? true);
    }
  } catch { toast.error("Failed to load trial balance"); }
  finally { setLoading(false); }
};

  const openLedger = (account: IAccount) => {
    setSelectedAccount(account);
    setView("ledger");
    fetchLedger(account);
  };

  const exportCSV = (data: any[], filename: string, headers: string[]) => {
    const rows = data.map(row => headers.map(h => row[h.toLowerCase().replace(/ /g, "")] ?? "").join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const getTypeBadge = (type: string) => {
    const map: Record<string, string> = {
      asset:     isDark ? "bg-green-500/20 text-green-300 border-green-500/30"    : "bg-green-50 text-green-700 border-green-200",
      liability: isDark ? "bg-red-500/20 text-red-300 border-red-500/30"          : "bg-red-50 text-red-700 border-red-200",
      equity:    isDark ? "bg-purple-500/20 text-purple-300 border-purple-500/30" : "bg-purple-50 text-purple-700 border-purple-200",
      revenue:   isDark ? "bg-blue-500/20 text-blue-300 border-blue-500/30"       : "bg-blue-50 text-blue-700 border-blue-200",
      expense:   isDark ? "bg-orange-500/20 text-orange-300 border-orange-500/30" : "bg-orange-50 text-orange-700 border-orange-200",
    };
    return map[type] || (isDark ? "bg-gray-500/20 text-gray-300" : "bg-gray-100 text-gray-600");
  };

const fmt = (n: any) =>
  new Intl.NumberFormat("en-US").format(Number(n) || 0);
  const fmtDrCr = (n: any, type: string) => {
  const val = Number(n) || 0;
  const normalDebit = ["asset", "expense"].includes(type);
  const isDr = normalDebit ? val >= 0 : val < 0;
  return `${fmt(Math.abs(val))} ${isDr ? "Dr" : "Cr"}`;
};


  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 backdrop-blur-xl transition-colors duration-500"
          style={{ background: th.mobileHeaderBg, borderBottom: `1px solid ${th.mobileHeaderBorder}` }}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {view !== "accounts" && (
                  <button onClick={() => setView("accounts")} className="p-2 rounded-xl active:scale-95"
                    style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                <div>
                  <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: th.mobileHeaderTitle }}>
                    <BookOpen className="h-5 w-5 text-[#E84545]" />
                    {view === "accounts" ? "Ledgers" : view === "ledger" ? selectedAccount?.name : "Trial Balance"}
                  </h1>
                  <p className="text-xs flex items-center gap-1" style={{ color: th.mobileHeaderSub }}>
                    {view === "accounts" ? `${filteredAccounts.length} accounts` : view === "ledger" ? selectedAccount?.code : ""}
                    {isDark ? <Moon className="h-3 w-3 inline ml-1 text-[#E84545]" /> : <Sun className="h-3 w-3 inline ml-1 text-[#E84545]" />}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {view === "accounts" && (
                  <>
                    <button onClick={() => setShowMobileFilters(true)} className="p-2 rounded-xl active:scale-95"
                      style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                      <Filter className="h-4 w-4" />
                    </button>
                    <button onClick={() => { setView("trialBalance"); fetchTrialBalance(); }}
                      className="flex items-center gap-1 px-3 py-2 text-white rounded-lg text-xs font-semibold"
                      style={{ background: "linear-gradient(to right,#E84545,#cc3c3c)" }}>
                      <BarChart3 className="h-3 w-3" />TB
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: th.filterIcon }} />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search accounts..." className="w-full pl-10 pr-4 py-2 rounded-xl text-sm"
                style={{ background: th.mobileSearchBg, border: `1px solid ${th.mobileSearchBorder}`, color: th.mobileSearchText }} />
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 border-b shadow-lg transition-colors duration-500"
          style={{ background: `linear-gradient(135deg,${th.headerBgFrom},${th.headerBgVia},${th.headerBgTo})`, borderColor: th.headerBorder }}>
          <div className="px-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                {view !== "accounts" && (
                  <button onClick={() => setView("accounts")} className="p-2 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.10)", color: th.headerTitle }}>
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: th.headerTitle }}>
                      <BookOpen className="h-7 w-7" />
                      {view === "accounts" ? "General Ledger" : view === "ledger" ? selectedAccount?.name : "Trial Balance"}
                    </h1>
                    
                  </div>
                  <p className="mt-1" style={{ color: th.headerSub }}>
                    {view === "accounts" ? "View and manage account ledgers" : view === "ledger" ? `Account: ${selectedAccount?.code}` : "Debit/Credit balance report"}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                {view === "accounts" && (
                  <>
                    <button onClick={() => exportCSV(filteredAccounts, "accounts.csv", ["Code", "Name", "Type", "Opening Balance", "Current Balance"])}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                      style={{ background: "rgba(255,255,255,0.10)", color: th.headerTitle }}>
                      <FileDown className="h-4 w-4" />Export
                    </button>
                    <button onClick={() => { setView("trialBalance"); fetchTrialBalance(); }}
                      className="flex items-center gap-2 px-5 py-3 rounded-lg font-semibold shadow-lg"
                      style={{ background: th.headerBtnBg, color: th.headerBtnText }}>
                      <BarChart3 className="h-5 w-5" />Trial Balance
                    </button>
                  </>
                )}
                {view === "ledger" && (
                  <button onClick={() => exportCSV(ledgerEntries, `ledger-${selectedAccount?.code}.csv`, ["Date", "Type", "Voucher Number", "Narration", "Debit", "Credit", "Balance"])}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ background: "rgba(255,255,255,0.10)", color: th.headerTitle }}>
                    <FileDown className="h-4 w-4" />Export CSV
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 md:px-6 pt-[160px] md:pt-6 pb-8">

          {/* ── ACCOUNTS VIEW ── */}
          {view === "accounts" && (
            <>
              {/* Desktop Filters */}
              <div className="hidden md:block rounded-xl p-4 mb-6 transition-colors duration-500"
                style={{ background: th.filterPanelBg, border: `1px solid ${th.filterPanelBorder}` }}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: th.filterIcon }} />
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Search accounts by name or code..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm"
                      style={selectStyle} />
                  </div>
                  <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                    className="px-3 py-2.5 rounded-lg text-sm appearance-none" style={selectStyle}>
                    <option value="all">All Types</option>
                    {["asset","liability","equity","revenue","expense"].map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                  <button onClick={fetchAccounts} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm"
                    style={{ background: "linear-gradient(to right,#E84545,#cc3c3c)", color: "#ffffff" }}>
                    <RefreshCw className="h-4 w-4" />Refresh
                  </button>
                </div>
              </div>

              {/* Accounts Grid */}
              {loading ? (
                <div className="text-center py-16">
                  <RefreshCw className="h-10 w-10 mx-auto animate-spin text-[#E84545] mb-4" />
                  <p style={{ color: th.emptyText }}>Loading accounts...</p>
                </div>
              ) : filteredAccounts.length === 0 ? (
                <div className="text-center py-16">
                  <BookOpen className="h-14 w-14 mx-auto mb-4" style={{ color: th.emptyIcon }} />
                  <p className="text-lg font-medium" style={{ color: th.emptyText }}>No accounts found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAccounts.map(acc => (
                    <div key={acc._id}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openLedger(acc); }}
                      className="rounded-xl p-4 cursor-pointer transition-all duration-300 group"
                      style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = th.cardHoverBorder)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = th.cardBorder)}
                      onClick={() => openLedger(acc)}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs font-mono mb-1" style={{ color: th.cardMuted }}>{acc.code}</p>
                          <h3 className="font-bold" style={{ color: th.cardTitle }}>{acc.name}</h3>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTypeBadge(acc.type)}`}>
                          {acc.type}
                        </span>
                      </div>
                      {acc.group && <p className="text-xs mb-3" style={{ color: th.cardMuted }}>Group: {acc.group}</p>}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg p-2" style={{ background: th.innerBg }}>
                          <p className="text-xs" style={{ color: th.cardMuted }}>Opening</p>
                          <p className="text-sm font-semibold" style={{ color: th.cardTitle }}>{fmt(acc.openingBalance)}</p>
                        </div>
                        <div className="rounded-lg p-2" style={{ background: th.innerBg }}>
                          <p className="text-xs" style={{ color: th.cardMuted }}>Current</p>
                          <p className="text-sm font-bold text-[#E84545]">{fmt(acc.currentBalance)}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-1 text-xs" style={{ color: th.cardMuted }}>
                        <Eye className="h-3 w-3" />View Ledger
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── LEDGER DETAIL VIEW ── */}
          {view === "ledger" && selectedAccount && (
            <>
              {/* Date Range Filter */}
              <div className="rounded-xl p-4 mb-6 transition-colors duration-500"
                style={{ background: th.filterPanelBg, border: `1px solid ${th.filterPanelBorder}` }}>
                <div className="flex flex-col md:flex-row gap-3 items-end">
                  <div className="flex-1">
                    <label htmlFor="ledger-from-date" className="block text-xs mb-1" style={{ color: th.tableHeaderText }}>From Date</label>
                    <input id="ledger-from-date" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm" style={selectStyle} />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="ledger-to-date" className="block text-xs mb-1" style={{ color: th.tableHeaderText }}>To Date</label>
                    <input id="ledger-to-date" type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm" style={selectStyle} />
                  </div>
                  <button onClick={() => fetchLedger(selectedAccount)}
                    className="px-4 py-2 rounded-lg text-sm text-white font-semibold"
                    style={{ background: "linear-gradient(to right,#E84545,#cc3c3c)" }}>
                    Apply & Refresh
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Opening Balance", value: fmt(ledgerSummary.opening) },
                  { label: "Total Debit", value: fmt(ledgerSummary.totalDebit), color: isDark ? "#f87171" : "#dc2626" },
                  { label: "Total Credit", value: fmt(ledgerSummary.totalCredit), color: isDark ? "#86efac" : "#15803d" },
                  { label: "Closing Balance", value: fmtDrCr(ledgerSummary.closing, selectedAccount.type), accent: true },
                ].map(card => (
                  <div key={card.label} className="rounded-xl p-4 transition-colors duration-500"
                    style={{ background: th.summaryCardBg, border: `1px solid ${card.accent ? "rgba(232,69,69,0.30)" : th.summaryCardBorder}` }}>
                    <p className="text-xs mb-1" style={{ color: th.cardMuted }}>{card.label}</p>
                    <p className="text-lg font-bold" style={{ color: card.color || (card.accent ? "#E84545" : th.cardTitle) }}>
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Entries Table (desktop) */}
              <div className="hidden md:block rounded-xl overflow-hidden transition-colors duration-500"
                style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: th.tableHeaderBg }}>
                      {["Date","Type","Voucher #","Narration","Dr.","Cr.","Balance"].map(h => (
                        <th key={h} className="px-4Z py-3 text-left text-xs font-medium" style={{ color: th.tableHeaderText }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map((e, i) => (
                      <tr key={e._id} className="transition-colors"
                        style={{ borderTop: `1px solid ${th.tableBorder}` }}
                        onMouseEnter={el => (el.currentTarget.style.background = th.tableRowHover)}
                        onMouseLeave={el => (el.currentTarget.style.background = "transparent")}>
                        <td className="px-4 py-3" style={{ color: th.cardSubtext }}>{new Date(e.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3" style={{ color: th.cardSubtext }}>{e.type}</td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: th.cardMuted }}>{e.voucherNumber}</td>
                        <td className="px-4 py-3" style={{ color: th.cardTitle }}>{e.narration}</td>
                        <td className="px-4 py-3 text-right" style={{ color: isDark ? "#f87171" : "#dc2626" }}>{e.debit > 0 ? fmt(e.debit) : ""}</td>
                        <td className="px-4 py-3 text-right" style={{ color: isDark ? "#86efac" : "#15803d" }}>{e.credit > 0 ? fmt(e.credit) : ""}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#E84545]">{fmt(e.balance)}</td>
                      </tr>
                    ))}
                    {ledgerEntries.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-12" style={{ color: th.emptyText }}>No entries found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {ledgerEntries.map(e => (
                  <div key={e._id} className="rounded-xl p-4 transition-colors duration-500"
                    style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs font-mono" style={{ color: th.cardMuted }}>{e.voucherNumber}</p>
                        <p className="font-medium text-sm" style={{ color: th.cardTitle }}>{e.narration}</p>
                      </div>
                      <p className="text-xs" style={{ color: th.cardMuted }}>{new Date(e.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-4 text-sm">
                      {e.debit > 0 && <span style={{ color: isDark ? "#f87171" : "#dc2626" }}>Dr: {fmt(e.debit)}</span>}
                      {e.credit > 0 && <span style={{ color: isDark ? "#86efac" : "#15803d" }}>Cr: {fmt(e.credit)}</span>}
                      <span className="ml-auto font-semibold text-[#E84545]">{fmt(e.balance)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── TRIAL BALANCE VIEW ── */}
          {view === "trialBalance" && (
            <>
              {/* Date Range */}
              <div className="rounded-xl p-4 mb-6 transition-colors duration-500"
                style={{ background: th.filterPanelBg, border: `1px solid ${th.filterPanelBorder}` }}>
                <div className="flex flex-col md:flex-row gap-3 items-end">
                  <div className="flex-1">
                    <label htmlFor="tb-from-date" className="block text-xs mb-1" style={{ color: th.tableHeaderText }}>From</label>
                    <input id="tb-from-date" type="date" value={tbDateRange.fromDate} onChange={e => setTbDateRange(p => ({ ...p, fromDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm" style={selectStyle} />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="tb-to-date" className="block text-xs mb-1" style={{ color: th.tableHeaderText }}>To</label>
                    <input id="tb-to-date" type="date" value={tbDateRange.toDate} onChange={e => setTbDateRange(p => ({ ...p, toDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm" style={selectStyle} />
                  </div>
                  <button onClick={fetchTrialBalance} className="px-4 py-2 rounded-lg text-sm text-white font-semibold"
                    style={{ background: "linear-gradient(to right,#E84545,#cc3c3c)" }}>
                    Apply & Refresh
                  </button>
                </div>
              </div>

              {/* Balance Status */}
              <div className="rounded-xl p-4 mb-6 transition-colors duration-500"
                style={{ background: tbBalanced ? (isDark ? "rgba(34,197,94,0.10)" : "rgba(34,197,94,0.06)") : (isDark ? "rgba(239,68,68,0.10)" : "rgba(239,68,68,0.06)"), border: `1px solid ${tbBalanced ? (isDark ? "rgba(34,197,94,0.30)" : "rgba(34,197,94,0.20)") : (isDark ? "rgba(239,68,68,0.30)" : "rgba(239,68,68,0.20)")}` }}>
                <div className="flex items-center gap-3">
                  <ArrowLeftRight className="h-5 w-5" style={{ color: tbBalanced ? (isDark ? "#86efac" : "#15803d") : (isDark ? "#f87171" : "#dc2626") }} />
                  <p className="font-semibold" style={{ color: tbBalanced ? (isDark ? "#86efac" : "#15803d") : (isDark ? "#f87171" : "#dc2626") }}>
                    {tbBalanced ? "✓ Trial Balance is Balanced" : "⚠ Trial Balance is Unbalanced"}
                  </p>
                </div>
              </div>

              {/* Trial Balance Table */}
              <div className="hidden md:block rounded-xl overflow-hidden transition-colors duration-500"
                style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: th.tableHeaderBg }}>
                      {["Code","Account","Type","Opening","Period Debit","Period Credit","Closing"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium" style={{ color: th.tableHeaderText }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trialBalance.map(a => (
  <tr key={a._id} className="transition-colors" style={{ borderTop: `1px solid ${th.tableBorder}` }}
    onMouseEnter={el => (el.currentTarget.style.background = th.tableRowHover)}
    onMouseLeave={el => (el.currentTarget.style.background = "transparent")}>
    <td className="px-4 py-3 font-mono text-xs" style={{ color: th.cardMuted }}>{a.accountCode}</td>
    <td className="px-4 py-3 font-medium" style={{ color: th.cardTitle }}>{a.accountName}</td>
    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs border ${getTypeBadge(a.accountType)}`}>{a.accountType}</span></td>
    <td className="px-4 py-3 text-right" style={{ color: th.cardSubtext }}>{fmt(a.openingBalance || 0)}</td>
    <td className="px-4 py-3 text-right" style={{ color: isDark ? "#f87171" : "#dc2626" }}>{fmt(a.periodDebit || 0)}</td>
    <td className="px-4 py-3 text-right" style={{ color: isDark ? "#86efac" : "#15803d" }}>{fmt(a.periodCredit || 0)}</td>
    <td className="px-4 py-3 text-right font-semibold text-[#E84545]">{fmtDrCr(a.closingBalance || 0, a.accountType)}</td>
  </tr>
))}
                    {/* Totals Row */}
                    {trialBalance.length > 0 && (
                      <tr style={{ background: th.tableHeaderBg, borderTop: `2px solid ${th.tableBorder}` }}>
                        <td colSpan={4} className="px-4 py-3 font-bold text-xs uppercase" style={{ color: th.tableHeaderText }}>Totals</td>
                        <td className="px-4 py-3 text-right font-bold" style={{ color: isDark ? "#f87171" : "#dc2626" }}>
                          {fmt(trialBalance.reduce((s, a) => s + (a.periodDebit || 0), 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-bold" style={{ color: isDark ? "#86efac" : "#15803d" }}>
                          {fmt(trialBalance.reduce((s, a) => s + (a.periodCredit || 0), 0))}
                        </td>
                        <td className="px-4 py-3" />
                      </tr>
                    )}
                    {trialBalance.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-12" style={{ color: th.emptyText }}>No data found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Trial Balance */}
              <div className="md:hidden space-y-3">
                {trialBalance.map(a => (
                  <div key={a._id} className="rounded-xl p-4" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs font-mono" style={{ color: th.cardMuted }}>{a.code}</p>
                        <p className="font-semibold" style={{ color: th.cardTitle }}>{a.name}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${getTypeBadge(a.type)}`}>{a.type}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><p style={{ color: th.cardMuted }}>Dr</p><p style={{ color: isDark ? "#f87171" : "#dc2626" }}>{fmt(a.periodDebit || 0)}</p></div>
                      <div><p style={{ color: th.cardMuted }}>Cr</p><p style={{ color: isDark ? "#86efac" : "#15803d" }}>{fmt(a.periodCredit || 0)}</p></div>
                      <div><p style={{ color: th.cardMuted }}>Closing</p><p className="text-[#E84545] font-semibold">{fmtDrCr(a.closingBalance || 0, a.type)}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="md:hidden h-24" />
        </div>
      </div>

      {/* Mobile Filters Sheet */}
      {showMobileFilters && isMobile && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-[60] animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom duration-300"
            style={{ background: th.modalBg, borderColor: th.modalBorder }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: th.modalTitle }}>Filters</h2>
              <button onClick={() => setShowMobileFilters(false)} className="p-2 rounded-xl"
                style={{ background: th.modalCloseBg, color: th.modalCloseText }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="ledger-account-type" className="block text-sm font-medium mb-2" style={{ color: th.modalLabel }}>Account Type</label>
                <select id="ledger-account-type" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-full px-3 py-3 rounded-xl"
                  style={{ background: th.modalSelectBg, border: `1px solid ${th.modalSelectBorder}`, color: th.modalSelectText }}>
                  <option value="all">All Types</option>
                  {["asset","liability","equity","revenue","expense"].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4" style={{ borderTop: `1px solid ${th.modalBorder}` }}>
                <button onClick={() => { setTypeFilter("all"); setShowMobileFilters(false); }}
                  className="flex-1 px-4 py-3 rounded-xl"
                  style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.actionBtnText }}>
                  Clear
                </button>
                <button onClick={() => setShowMobileFilters(false)}
                  className="flex-1 px-4 py-3 rounded-xl text-white font-semibold"
                  style={{ background: "linear-gradient(to right,#E84545,#cc3c3c)" }}>
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}