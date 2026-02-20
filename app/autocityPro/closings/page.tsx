"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import ClosingPreview from "@/components/closings/ClosingPreview";
import {
  Calendar, Lock, CheckCircle, XCircle, FileText, TrendingUp, DollarSign,
  BookOpen, AlertTriangle, Eye, Download, RefreshCw, MoreVertical, Filter, X,
  BarChart3, Clock, Wallet, ArrowUpRight, Zap, Search, Receipt, TrendingDown,
  Database, Shield, Sun, Moon,
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

interface ClosingData {
  _id: string; closingType: "day" | "month"; closingDate: string;
  periodStart: string; periodEnd: string; status: "closed" | "locked" | "pending";
  totalRevenue: number; totalCOGS: number; totalPurchases: number; totalExpenses: number;
  grossProfit: number; netProfit: number; openingCash: number; cashSales: number;
  cashReceipts: number; cashPayments: number; closingCash: number; bankSales: number;
  bankPayments: number; openingBank: number; closingBank: number; bankReceipts: number;
  totalOpeningBalance?: number; totalClosingBalance?: number; salesCount: number;
  totalDiscount: number; totalTax: number; openingStock: number; closingStock: number;
  stockValue: number; ledgerEntriesCount?: number; voucherIds?: string[];
  trialBalanceMatched?: boolean;
  closedBy: { firstName: string; lastName: string };
  closedAt: string;
  verifiedBy?: { firstName: string; lastName: string };
  verifiedAt?: string; notes?: string;
}

export default function ClosingsPage() {
  const router = useRouter();
  const isDark = useTimeBasedTheme();

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
  const [summary, setSummary] = useState({ totalClosings: 0, totalRevenue: 0, totalProfit: 0, avgProfit: 0 });

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    pageBg:              isDark ? '#0a0a0a'                                            : '#f3f4f6',
    // Mobile header
    mobileHdrBg:         isDark ? 'rgba(15,15,15,0.95)'                               : 'rgba(255,255,255,0.95)',
    mobileHdrBorder:     isDark ? 'rgba(239,68,68,0.10)'                              : 'rgba(239,68,68,0.15)',
    mobileHdrTitle:      isDark ? '#ffffff'                                            : '#111827',
    mobileHdrSub:        isDark ? '#6b7280'                                            : '#9ca3af',
    mobileBtnBg:         isDark ? '#1a1a1a'                                            : '#ffffff',
    mobileBtnBorder:     isDark ? 'rgba(239,68,68,0.20)'                              : 'rgba(239,68,68,0.20)',
    mobileBtnText:       isDark ? '#f87171'                                            : '#dc2626',
    // Desktop header bg layers
    desktopHdrGrad:      isDark ? 'rgba(69,10,10,0.40)'                               : 'rgba(254,242,242,0.90)',
    desktopHdrRadial:    isDark ? 'rgba(127,29,29,0.20)'                              : 'rgba(254,226,226,0.60)',
    desktopHdrTitle:     isDark ? '#ffffff'                                            : '#111827',
    desktopHdrSub:       isDark ? '#9ca3af'                                            : '#6b7280',
    desktopIconBg:       isDark ? 'rgba(239,68,68,0.10)'                              : 'rgba(239,68,68,0.08)',
    desktopIconBorder:   isDark ? 'rgba(239,68,68,0.20)'                              : 'rgba(239,68,68,0.20)',
    desktopIconText:     isDark ? '#f87171'                                            : '#dc2626',
    desktopIconGlow:     isDark ? 'rgba(239,68,68,0.20)'                              : 'rgba(239,68,68,0.08)',
    badgeBg:             isDark ? 'rgba(0,0,0,0.40)'                                  : 'rgba(255,255,255,0.80)',
    badgeBorder:         isDark ? 'rgba(255,255,255,0.15)'                            : 'rgba(153,27,27,0.20)',
    badgeText:           isDark ? 'rgba(255,255,255,0.70)'                            : '#991b1b',
    // Stat cards
    statCardBg:          isDark ? '#141414'                                            : '#ffffff',
    statCardBorder:      isDark ? 'rgba(239,68,68,0.10)'                              : 'rgba(0,0,0,0.08)',
    statCardHoverBorder: isDark ? 'rgba(239,68,68,0.30)'                              : 'rgba(239,68,68,0.30)',
    statLabelText:       isDark ? '#6b7280'                                            : '#9ca3af',
    statValueText:       isDark ? '#ffffff'                                            : '#111827',
    statMetaText:        isDark ? '#4b5563'                                            : '#d1d5db',
    // Filter panel
    filterPanelBg:       isDark ? '#141414'                                            : '#ffffff',
    filterPanelBorder:   isDark ? 'rgba(239,68,68,0.10)'                              : 'rgba(0,0,0,0.08)',
    filterLabelText:     isDark ? '#6b7280'                                            : '#9ca3af',
    filterInputBg:       isDark ? '#1a1a1a'                                            : '#f9fafb',
    filterInputBorder:   isDark ? 'rgba(239,68,68,0.20)'                              : 'rgba(0,0,0,0.10)',
    filterInputText:     isDark ? '#ffffff'                                            : '#111827',
    filterInputPH:       isDark ? '#4b5563'                                            : '#9ca3af',
    filterBtnActive:     isDark ? 'from-red-600 to-red-700'                           : 'from-red-600 to-red-700',
    filterBtnInactiveBg: isDark ? '#1a1a1a'                                            : '#f9fafb',
    filterBtnInactiveBorder: isDark ? 'rgba(239,68,68,0.10)'                          : 'rgba(0,0,0,0.08)',
    filterBtnInactiveText: isDark ? '#9ca3af'                                          : '#6b7280',
    filterClearBg:       isDark ? '#1a1a1a'                                            : '#f9fafb',
    filterClearBorder:   isDark ? 'rgba(239,68,68,0.20)'                              : 'rgba(0,0,0,0.10)',
    filterClearText:     isDark ? '#9ca3af'                                            : '#6b7280',
    // Closing cards
    cardBg:              isDark ? '#141414'                                            : '#ffffff',
    cardBorder:          isDark ? 'rgba(239,68,68,0.10)'                              : 'rgba(0,0,0,0.08)',
    cardHoverBorder:     isDark ? 'rgba(239,68,68,0.30)'                              : 'rgba(239,68,68,0.30)',
    cardHdrBgFrom:       isDark ? '#1a1a1a'                                            : '#fafafa',
    cardHdrBgTo:         isDark ? '#141414'                                            : '#ffffff',
    cardHdrBorder:       isDark ? 'rgba(239,68,68,0.10)'                              : 'rgba(0,0,0,0.06)',
    cardTitle:           isDark ? '#ffffff'                                            : '#111827',
    cardSub:             isDark ? '#6b7280'                                            : '#9ca3af',
    // Inner panels
    innerBg:             isDark ? '#1a1a1a'                                            : '#f9fafb',
    innerBorder:         isDark ? 'rgba(239,68,68,0.10)'                              : 'rgba(0,0,0,0.06)',
    innerLabel:          isDark ? '#6b7280'                                            : '#9ca3af',
    innerValue:          isDark ? '#9ca3af'                                            : '#6b7280',
    innerBoldText:       isDark ? '#9ca3af'                                            : '#374151',
    innerDivider:        isDark ? 'rgba(239,68,68,0.10)'                              : 'rgba(0,0,0,0.05)',
    // Empty / loading
    emptyIconBg:         isDark ? '#141414'                                            : '#f9fafb',
    emptyIconBorder:     isDark ? 'rgba(239,68,68,0.10)'                              : 'rgba(0,0,0,0.06)',
    emptyIconColor:      isDark ? '#374151'                                            : '#d1d5db',
    emptyTitle:          isDark ? '#d1d5db'                                            : '#374151',
    emptySubtext:        isDark ? '#6b7280'                                            : '#9ca3af',
    // Card footer/actions
    actionBtnBg:         isDark ? '#1a1a1a'                                            : '#f9fafb',
    actionBtnBorder:     isDark ? 'rgba(239,68,68,0.20)'                              : 'rgba(0,0,0,0.08)',
    actionBtnText:       isDark ? '#d1d5db'                                            : '#374151',
    actionBtnHoverBorder:isDark ? 'rgba(239,68,68,0.40)'                              : 'rgba(239,68,68,0.40)',
    footerDivider:       isDark ? 'rgba(239,68,68,0.10)'                              : 'rgba(0,0,0,0.05)',
    footerMeta:          isDark ? '#4b5563'                                            : '#9ca3af',
    // Modal
    modalOverlay:        'rgba(0,0,0,0.90)',
    modalBg:             isDark ? '#0f0f0f'                                            : '#ffffff',
    modalBorder:         isDark ? 'rgba(239,68,68,0.20)'                              : 'rgba(239,68,68,0.20)',
    modalHdrGrad:        isDark ? 'rgba(220,38,38,0.20)'                              : 'rgba(254,242,242,0.80)',
    modalHdrSubGrad:     isDark ? 'rgba(239,68,68,0.10)'                              : 'rgba(254,226,226,0.40)',
    modalHdrBorder:      isDark ? 'rgba(239,68,68,0.20)'                              : 'rgba(239,68,68,0.15)',
    modalTitle:          isDark ? '#ffffff'                                            : '#111827',
    modalSubtitle:       isDark ? '#6b7280'                                            : '#9ca3af',
    modalInputBg:        isDark ? '#1a1a1a'                                            : '#f9fafb',
    modalInputBorder:    isDark ? 'rgba(239,68,68,0.20)'                              : 'rgba(0,0,0,0.10)',
    modalInputText:      isDark ? '#ffffff'                                            : '#111827',
    modalLabel:          isDark ? '#6b7280'                                            : '#9ca3af',
    modalFtrBg:          isDark ? '#141414'                                            : '#f9fafb',
    modalFtrBorder:      isDark ? 'rgba(239,68,68,0.10)'                              : 'rgba(0,0,0,0.06)',
    modalCancelBg:       isDark ? '#1a1a1a'                                            : '#ffffff',
    modalCancelBorder:   isDark ? 'rgba(239,68,68,0.20)'                              : 'rgba(0,0,0,0.10)',
    modalCancelText:     isDark ? '#d1d5db'                                            : '#374151',
    // Mobile modals (filter + action menu)
    sheetBg:             isDark ? '#0f0f0f'                                            : '#ffffff',
    sheetBorder:         isDark ? 'rgba(239,68,68,0.20)'                              : 'rgba(239,68,68,0.15)',
    sheetTitle:          isDark ? '#ffffff'                                            : '#111827',
    sheetCloseBg:        isDark ? '#1a1a1a'                                            : 'rgba(0,0,0,0.05)',
    sheetCloseText:      isDark ? '#9ca3af'                                            : '#6b7280',
    sheetLabelText:      isDark ? '#6b7280'                                            : '#9ca3af',
    sheetInputBg:        isDark ? '#1a1a1a'                                            : '#f9fafb',
    sheetInputBorder:    isDark ? 'rgba(239,68,68,0.20)'                              : 'rgba(0,0,0,0.10)',
    sheetInputText:      isDark ? '#ffffff'                                            : '#111827',
    sheetClearBg:        isDark ? '#1a1a1a'                                            : '#f9fafb',
    sheetClearBorder:    isDark ? 'rgba(239,68,68,0.20)'                              : 'rgba(0,0,0,0.10)',
    sheetClearText:      isDark ? '#d1d5db'                                            : '#374151',
    sheetItemBg:         isDark ? '#1a1a1a'                                            : '#f9fafb',
    sheetItemBorder:     isDark ? 'rgba(239,68,68,0.20)'                              : 'rgba(0,0,0,0.08)',
    sheetItemText:       isDark ? '#ffffff'                                            : '#111827',
  };

  useEffect(() => {
    fetchUser(); fetchClosings();
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [filterType, filterStatus]);

  const fetchUser = async () => {
    try { const res = await fetch("/api/auth/me", { credentials: "include" }); if (res.ok) setUser((await res.json()).user); } catch {}
  };

  const fetchClosings = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType !== "all") params.append("closingType", filterType);
      if (filterStatus !== "all") params.append("status", filterStatus);
      const res = await fetch(`/api/closings${params.toString() ? "?" + params : ""}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setClosings(data.closings || []);
        const totalRevenue = data.closings.reduce((s: number, c: ClosingData) => s + c.totalRevenue, 0);
        const totalProfit  = data.closings.reduce((s: number, c: ClosingData) => s + c.netProfit, 0);
        setSummary({ totalClosings: data.closings.length, totalRevenue, totalProfit, avgProfit: data.closings.length ? totalProfit / data.closings.length : 0 });
      }
    } catch { toast.error("Failed to fetch closings"); } finally { setLoading(false); }
  };

  const handleClose = async () => {
    if (isClosing) return;
    setIsClosing(true);
    try {
      const res = await fetch("/api/closings", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(newClosing) });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `${newClosing.closingType === "day" ? "Day" : "Month"} closed successfully!`);
        setShowCloseModal(false); setShowPreview(false);
        setNewClosing({ closingType: "day", closingDate: new Date().toISOString().split("T")[0], notes: "" });
        fetchClosings();
      } else {
        toast.error(data.error || "Failed to close period");
        if (data.expectedDate || data.expectedMonth) setTimeout(() => toast.error(`Please close ${data.expectedDate || data.expectedMonth} first`, { duration: 5000 }), 100);
      }
    } catch { toast.error("Failed to close period"); } finally { setIsClosing(false); }
  };

  const handleShowPreview = () => {
    if (!newClosing.closingDate) { toast.error("Please select a closing date"); return; }
    setShowPreview(true);
  };

  const handleLogout = async () => { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); window.location.href = "/autocityPro/login"; };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "locked":  return "bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30 text-red-400";
      case "closed":  return "bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400";
      case "pending": return "bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400";
      default:        return "bg-gradient-to-br from-gray-500/20 to-gray-600/10 border-gray-500/30 text-gray-400";
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "locked":  return <Lock className="h-3.5 w-3.5" />;
      case "closed":  return <CheckCircle className="h-3.5 w-3.5" />;
      case "pending": return <Clock className="h-3.5 w-3.5" />;
      default:        return <FileText className="h-3.5 w-3.5" />;
    }
  };

  const clearFilters = () => { setFilterType("all"); setFilterStatus("all"); setSearchQuery(""); };

  const downloadClosingsCSV = () => {
    if (!closings.length) { toast.error("No closings to export"); return; }
    const rows = closings.map(c => [new Date(c.closingDate).toLocaleDateString(), c.closingType, c.status, c.totalRevenue, c.totalCOGS||0, c.totalPurchases, c.totalExpenses, c.grossProfit||0, c.netProfit, `${c.closedBy?.firstName} ${c.closedBy?.lastName}`]);
    const csv = [["Date","Type","Status","Revenue","COGS","Purchases","Expenses","Gross Profit","Net Profit","Closed By"].join(","), ...rows.map(r => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    link.download = `closings_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast.success(`Exported ${closings.length} closings to CSV`);
  };

  const downloadClosingPDF = async (closingId: string) => {
    try {
      toast.loading("Generating PDF...", { id: "pdf-generate" });
      const [, , res] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
        fetch(`/api/closings/${closingId}/pdf`, { credentials: "include" }),
      ]);
      if (!res.ok) throw new Error("Failed to fetch closing data");
      const { data } = await res.json();
      const { generateClosingPDF } = await import("@/lib/utils/closingPdfGenerator");
      const pdfBlob = await generateClosingPDF(data);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${data.closing.closingType === "day" ? "Daily" : "Monthly"}_Closing_${new Date(data.closing.closingDate).toLocaleDateString("en-US").replace(/\//g,"-")}.pdf`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
      toast.success("PDF downloaded!", { id: "pdf-generate" });
    } catch { toast.error("Failed to generate PDF", { id: "pdf-generate" }); }
  };

  const filteredClosings = closings.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.closingType.toLowerCase().includes(q) || c.status.toLowerCase().includes(q) ||
      new Date(c.closingDate).toLocaleDateString().toLowerCase().includes(q) ||
      `${c.closedBy?.firstName} ${c.closedBy?.lastName}`.toLowerCase().includes(q);
  });

  const filterBtnCls = (active: boolean) => active
    ? `flex-1 px-4 py-3 rounded-xl font-medium text-sm bg-gradient-to-br ${th.filterBtnActive} text-white shadow-lg shadow-red-500/25`
    : `flex-1 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-300`;
  const filterBtnStyle = (active: boolean) => active ? {} : { background: th.filterBtnInactiveBg, border: `1px solid ${th.filterBtnInactiveBorder}`, color: th.filterBtnInactiveText };

  const modalInputCls = "w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-red-500/20 transition-all font-medium";
  const modalInputStyle = { background: th.modalInputBg, border: `1px solid ${th.modalInputBorder}`, color: th.modalInputText };

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* ── Mobile Header ───────────────────────────────────────────── */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 backdrop-blur-xl transition-colors duration-500"
          style={{ background: th.mobileHdrBg, borderBottom: `1px solid ${th.mobileHdrBorder}` }}>
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight" style={{ color: th.mobileHdrTitle }}>Period Closings</h1>
                  
                </div>
                <p className="text-xs mt-0.5" style={{ color: th.mobileHdrSub }}>{filteredClosings.length} records</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowFilters(true)} className="p-2.5 rounded-lg active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, border: `1px solid ${th.mobileBtnBorder}`, color: th.mobileBtnText }}>
                  <Filter className="h-4 w-4" />
                </button>
                <button onClick={() => setShowMobileMenu(true)} className="p-2.5 rounded-lg active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, border: `1px solid ${th.mobileBtnBorder}`, color: th.mobileBtnText }}>
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Desktop Header ──────────────────────────────────────────── */}
        <div className="hidden md:block relative overflow-hidden transition-colors duration-500">
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg,${th.desktopHdrGrad},transparent)` }} />
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at top right, ${th.desktopHdrRadial},transparent,transparent)` }} />
          <div className="absolute inset-0" style={{
            backgroundImage: 'url(\'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtMy4zMTQgMC02IDIuNjg2LTYgNnMyLjY4NiA2IDYgNiA2LTIuNjg2IDYtNi0yLjY4Ni02LTYtNnoiIHN0cm9rZT0iIzk5MTgxOCIgc3Ryb2tlLXdpZHRoPSIuNSIgb3BhY2l0eT0iLjEiLz48L2c+PC9zdmc+\')',
            opacity: isDark ? 0.20 : 0.06,
          }} />
          <div className="relative px-8 py-16">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="absolute inset-0 blur-xl rounded-2xl" style={{ background: th.desktopIconGlow }} />
                    <div className="relative p-4 backdrop-blur-sm rounded-2xl" style={{ background: th.desktopIconBg, border: `1px solid ${th.desktopIconBorder}` }}>
                      <BookOpen className="h-10 w-10" style={{ color: th.desktopIconText }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-4xl font-bold tracking-tight" style={{ color: th.desktopHdrTitle }}>Period Closings</h1>
                      
                    </div>
                    <p className="text-sm mt-1" style={{ color: th.desktopHdrSub }}>Ledger-driven accounting with COGS tracking</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={downloadClosingsCSV}
                    className="group flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-300 font-medium"
                    style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.actionBtnText }}>
                    <Download className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span>Export CSV</span>
                  </button>
                  <button onClick={() => setShowCloseModal(true)}
                    className="group relative flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-xl hover:from-red-500 hover:to-red-600 transition-all duration-300 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/40">
                    <div className="absolute inset-0 bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Lock className="h-4 w-4 relative z-10 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold relative z-10">Close Period</span>
                  </button>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon:Calendar, iconBg:'bg-red-500/10', iconText:'text-red-400', accent:'from-red-500/5', label:'Total Closings',  value:summary.totalClosings.toString(), meta:null, valueClass:'text-white' },
                  { icon:DollarSign, iconBg:'bg-blue-500/10', iconText:'text-blue-400', accent:'from-blue-500/5', label:'Total Revenue', value:summary.totalRevenue.toLocaleString('en-QA',{minimumFractionDigits:0,maximumFractionDigits:0}), meta:'QAR', valueClass:'text-white' },
                  { icon:TrendingUp,  iconBg:'bg-emerald-500/10', iconText:'text-emerald-400', accent:'from-emerald-500/5', label:'Total Net Profit', value:summary.totalProfit.toLocaleString('en-QA',{minimumFractionDigits:0,maximumFractionDigits:0}), meta:'QAR', valueClass:summary.totalProfit>=0?'text-emerald-400':'text-red-400' },
                  { icon:BarChart3,  iconBg:'bg-purple-500/10', iconText:'text-purple-400', accent:'from-purple-500/5', label:'Avg Net Profit',   value:summary.avgProfit.toLocaleString('en-QA',{minimumFractionDigits:0,maximumFractionDigits:0}), meta:'QAR per period', valueClass:summary.avgProfit>=0?'text-purple-400':'text-red-400' },
                ].map((s, i) => (
                  <div key={s.label} className="group relative overflow-hidden rounded-2xl transition-all duration-300"
                    style={{ background: th.statCardBg, border: `1px solid ${th.statCardBorder}` }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = th.statCardHoverBorder)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = th.statCardBorder)}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    <div className="relative p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-2.5 ${s.iconBg} rounded-lg`}><s.icon className={`h-5 w-5 ${s.iconText}`} /></div>
                        <ArrowUpRight className={`h-4 w-4 ${s.iconText}`} />
                      </div>
                      <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: th.statLabelText }}>{s.label}</p>
                      <p className={`text-3xl font-bold tracking-tight ${s.valueClass}`}>{s.value}</p>
                      {s.meta && <p className="text-xs mt-1" style={{ color: th.statMetaText }}>{s.meta}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[140px] md:pt-8 pb-8">
          <div className="max-w-7xl mx-auto">

            {/* Desktop Filters */}
            <div className="hidden md:block mb-8">
              <div className="p-6 rounded-2xl transition-colors duration-500"
                style={{ background: th.filterPanelBg, border: `1px solid ${th.filterPanelBorder}` }}>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4">
                    <label htmlFor="closings-search" className="block text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: th.filterLabelText }}>Search Closings</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: th.filterInputPH }} />
                      <input id="closings-search" type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by date, type, status..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-red-500/20 transition-all"
                        style={{ background: th.filterInputBg, border: `1px solid ${th.filterInputBorder}`, color: th.filterInputText }} />
                    </div>
                  </div>
                  <div className="col-span-3">
                    <span className="block text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: th.filterLabelText }}>Period Type</span>
                    <div className="flex gap-2">
                      {["all","day","month"].map(t => (
                        <button key={t} onClick={() => setFilterType(t)} className={filterBtnCls(filterType===t)} style={filterBtnStyle(filterType===t)}>
                          {t==="all"?"All":t==="day"?"Daily":"Monthly"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-3">
                    <span className="block text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: th.filterLabelText }}>Status</span>
                    <div className="flex gap-2">
                      {["all","closed","locked"].map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)} className={filterBtnCls(filterStatus===s)} style={filterBtnStyle(filterStatus===s)}>
                          {s==="all"?"All":s.charAt(0).toUpperCase()+s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2 flex items-end">
                    <button onClick={clearFilters} className="w-full px-4 py-3 rounded-xl font-medium transition-all"
                      style={{ background: th.filterClearBg, border: `1px solid ${th.filterClearBorder}`, color: th.filterClearText }}>
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
                  <p className="text-lg mt-6 font-medium" style={{ color: th.emptySubtext }}>Loading closings...</p>
                </div>
              ) : closings.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-24">
                  <div className="p-6 rounded-2xl mb-6" style={{ background: th.emptyIconBg, border: `1px solid ${th.emptyIconBorder}` }}>
                    <BookOpen className="h-16 w-16" style={{ color: th.emptyIconColor }} />
                  </div>
                  <p className="text-xl font-semibold mb-2" style={{ color: th.emptyTitle }}>No closings found</p>
                  <p className="text-sm mb-6" style={{ color: th.emptySubtext }}>Start managing your financial periods</p>
                  <button onClick={() => setShowCloseModal(true)}
                    className="px-8 py-3 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-xl hover:from-red-500 hover:to-red-600 transition-all duration-300 font-semibold shadow-lg shadow-red-500/25">
                    Close First Period
                  </button>
                </div>
              ) : closings.map(closing => {
                const totalOpeningBalance = closing.totalOpeningBalance ?? (closing.openingCash + closing.openingBank);
                const totalClosingBalance = closing.totalClosingBalance ?? (closing.closingCash + closing.closingBank);
                const totalCosts = (closing.totalCOGS||0) + closing.totalPurchases + closing.totalExpenses;

                return (
                  <div key={closing._id} className="group relative">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 rounded-2xl blur-xl transition-all duration-500"
                      style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0),rgba(239,68,68,0.05),rgba(239,68,68,0))' }} />
                    <div className="relative rounded-2xl overflow-hidden transition-all duration-300"
                      style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = th.cardHoverBorder)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = th.cardBorder)}>

                      {/* Card Header */}
                      <div className="relative p-5 border-b" style={{ background: `linear-gradient(135deg,${th.cardHdrBgFrom},${th.cardHdrBgTo})`, borderColor: th.cardHdrBorder }}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500/10 rounded-lg">
                              <Calendar className="h-4 w-4 text-red-400" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold" style={{ color: th.cardTitle }}>
                                {closing.closingType==="day"?"Daily":"Monthly"} Closing
                              </h3>
                              <p className="text-xs mt-0.5" style={{ color: th.cardSub }}>
                                {new Date(closing.closingDate).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})}
                              </p>
                            </div>
                          </div>
                          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${getStatusColor(closing.status)}`}>
                            {getStatusIcon(closing.status)}
                            <span className="text-[10px] font-bold uppercase tracking-wide">{closing.status}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5 space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-emerald-400" />
                              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: th.innerLabel }}>Revenue</span>
                            </div>
                            <span className="text-lg font-bold text-emerald-400">{closing.totalRevenue.toLocaleString("en-QA",{minimumFractionDigits:0})}</span>
                          </div>

                          <div className="p-3 rounded-xl space-y-2" style={{ background: th.innerBg }}>
                            <div className="flex items-center gap-2 mb-2">
                              <Receipt className="h-3.5 w-3.5" style={{ color: th.innerLabel }} />
                              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: th.innerLabel }}>Costs</span>
                            </div>
                            {closing.totalCOGS > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-xs" style={{ color: th.innerLabel }}>COGS</span>
                                <span className="text-sm font-semibold" style={{ color: th.innerValue }}>{closing.totalCOGS.toLocaleString("en-QA",{minimumFractionDigits:0})}</span>
                              </div>
                            )}
                            {[{label:"Purchases",val:closing.totalPurchases},{label:"Expenses",val:closing.totalExpenses}].map(r => (
                              <div key={r.label} className="flex justify-between items-center">
                                <span className="text-xs" style={{ color: th.innerLabel }}>{r.label}</span>
                                <span className="text-sm font-semibold" style={{ color: th.innerValue }}>{r.val.toLocaleString("en-QA",{minimumFractionDigits:0})}</span>
                              </div>
                            ))}
                            <div className="pt-2" style={{ borderTop: `1px solid ${th.innerDivider}` }}>
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-red-400">Total Costs</span>
                                <span className="text-sm font-bold text-red-400">{totalCosts.toLocaleString("en-QA",{minimumFractionDigits:0})}</span>
                              </div>
                            </div>
                          </div>

                          {closing.grossProfit !== undefined && closing.totalCOGS > 0 && (
                            <div className="flex justify-between items-center p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: th.innerLabel }}>Gross Profit</span>
                              <span className={`text-base font-bold ${closing.grossProfit>=0?"text-blue-400":"text-red-400"}`}>
                                {closing.grossProfit.toLocaleString("en-QA",{minimumFractionDigits:0})}
                              </span>
                            </div>
                          )}

                          <div className="relative p-4 bg-gradient-to-br from-red-500/5 to-red-600/5 rounded-xl border border-red-500/20">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                {closing.netProfit>=0 ? <TrendingUp className="h-4 w-4 text-emerald-400" /> : <TrendingDown className="h-4 w-4 text-red-400" />}
                                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: th.innerValue }}>Net Profit</span>
                              </div>
                              <span className={`text-2xl font-black ${closing.netProfit>=0?"text-emerald-400":"text-red-400"}`}>
                                {closing.netProfit.toLocaleString("en-QA",{minimumFractionDigits:0})}
                              </span>
                            </div>
                            <p className="text-[10px] mt-1" style={{ color: th.footerMeta }}>= Revenue - (COGS + Purchases + Expenses)</p>
                          </div>
                        </div>

                        {/* Total Balance */}
                        <div className="relative p-4 bg-gradient-to-br from-purple-500/5 to-purple-600/5 rounded-xl border border-purple-500/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Wallet className="h-4 w-4 text-purple-400" />
                            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wide">Total Balance</h4>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs" style={{ color: th.innerLabel }}>Opening</span>
                              <span className="text-sm font-semibold" style={{ color: th.innerValue }}>{totalOpeningBalance.toLocaleString("en-QA",{minimumFractionDigits:0})}</span>
                            </div>
                            <div className="h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-purple-400 uppercase">Closing</span>
                              <span className="text-xl font-black text-purple-400">{totalClosingBalance.toLocaleString("en-QA",{minimumFractionDigits:0})}</span>
                            </div>
                          </div>
                        </div>

                        {/* Cash & Bank */}
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label:'Cash', color:'blue', bg:'bg-blue-500/10', border:'border-blue-500/10', textColor:'text-blue-400', open:closing.openingCash, close:closing.closingCash },
                            { label:'Bank', color:'emerald', bg:'bg-emerald-500/10', border:'border-emerald-500/10', textColor:'text-emerald-400', open:closing.openingBank, close:closing.closingBank },
                          ].map(b => (
                            <div key={b.label} className={`p-3 rounded-xl border ${b.border}`} style={{ background: th.innerBg }}>
                              <div className="flex items-center gap-1.5 mb-2">
                                <div className={`w-2 h-2 ${b.bg} rounded-full`} />
                                <span className={`text-[10px] font-bold ${b.textColor} uppercase tracking-wide`}>{b.label}</span>
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-xs">
                                  <span style={{ color: th.innerLabel }}>Open</span>
                                  <span className="font-medium" style={{ color: th.innerValue }}>{b.open.toLocaleString("en-QA",{minimumFractionDigits:0})}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span style={{ color: th.innerLabel }}>Movement</span>
                                  <span className={`font-semibold ${b.close-b.open>=0?"text-emerald-400":"text-red-400"}`}>
                                    {(b.close-b.open).toLocaleString("en-QA")}
                                  </span>
                                </div>
                                <div className="pt-1.5" style={{ borderTop: `1px solid ${th.innerDivider}` }}>
                                  <div className="flex justify-between text-xs">
                                    <span className={`${b.textColor} font-bold`}>Close</span>
                                    <span className={`${b.textColor} font-bold`}>{b.close.toLocaleString("en-QA",{minimumFractionDigits:0})}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-3 gap-2">
                          {[{label:'Sales',val:closing.salesCount},{label:'Disc',val:closing.totalDiscount.toFixed(0)},{label:'Tax',val:closing.totalTax.toFixed(0)}].map(m => (
                            <div key={m.label} className="p-3 rounded-lg text-center" style={{ background: th.innerBg }}>
                              <p className="text-[10px] font-medium uppercase mb-1" style={{ color: th.innerLabel }}>{m.label}</p>
                              <p className="text-lg font-bold" style={{ color: th.cardTitle }}>{m.val}</p>
                            </div>
                          ))}
                        </div>

                        {closing.ledgerEntriesCount && (
                          <div className="flex items-center justify-between p-3 bg-purple-500/5 rounded-xl border border-purple-500/20">
                            <div className="flex items-center gap-2">
                              <Database className="h-3.5 w-3.5 text-purple-400" />
                              <span className="text-xs font-medium text-purple-400">{closing.ledgerEntriesCount} Ledger Entries</span>
                            </div>
                            {closing.trialBalanceMatched && (
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 rounded-full">
                                <Shield className="h-3 w-3 text-emerald-400" />
                                <span className="text-[10px] font-bold text-emerald-400 uppercase">Balanced</span>
                              </div>
                            )}
                          </div>
                        )}

                        {closing.notes && (
                          <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                            <div className="flex items-start gap-2">
                              <FileText className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-amber-300 line-clamp-2">{closing.notes}</p>
                            </div>
                          </div>
                        )}

                        <div className="pt-3" style={{ borderTop: `1px solid ${th.footerDivider}` }}>
                          <div className="flex items-center justify-between text-[10px] mb-3" style={{ color: th.footerMeta }}>
                            <span>By {closing.closedBy?.firstName} {closing.closedBy?.lastName}</span>
                            <span>{new Date(closing.closedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label:'View', icon:<Eye className="h-3.5 w-3.5" />, onClick:() => router.push(`/autocityPro/closings/${closing._id}`) },
                              { label:'PDF',  icon:<Download className="h-3.5 w-3.5" />, onClick:() => downloadClosingPDF(closing._id) },
                            ].map(a => (
                              <button key={a.label} onClick={a.onClick}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 font-medium"
                                style={{ background: th.actionBtnBg, border: `1px solid ${th.actionBtnBorder}`, color: th.actionBtnText }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = th.actionBtnHoverBorder)}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = th.actionBtnBorder)}>
                                {a.icon}<span className="text-xs">{a.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="md:hidden h-6" />
      </div>

      {/* ── Close Period Modal ─────────────────────────────────────────── */}
      {showCloseModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          style={{ background: th.modalOverlay, backdropFilter: 'blur(12px)' }}>
          <div className="relative rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95  transition-colors duration-500"
            style={{ background: th.modalBg, border: `1px solid ${th.modalBorder}` }}>
            <div className="relative overflow-hidden">
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg,${th.modalHdrGrad},${th.modalHdrSubGrad},transparent)` }} />
              <div className="relative px-6 py-6" style={{ borderBottom: `1px solid ${th.modalHdrBorder}` }}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-500/10 rounded-xl"><Lock className="h-6 w-6 text-red-400" /></div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight" style={{ color: th.modalTitle }}>Close Period</h2>
                      <p className="text-sm mt-1" style={{ color: th.modalSubtitle }}>
                        {showPreview ? "Review details before closing" : "Configure period closing settings"}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => { setShowCloseModal(false); setShowPreview(false); }}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-all" style={{ color: th.modalSubtitle }}>
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5 max-h-[calc(90vh-200px)] overflow-y-auto">
              {!showPreview ? (
                <>
                  {[
                    { label:'Closing Type', key:'closingType', type:'select', options:[{v:'day',l:'Daily Closing'},{v:'month',l:'Monthly Closing'}] },
                    { label:'Closing Date', key:'closingDate', type:'date' },
                    { label:'Notes',        key:'notes',       type:'textarea' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-3" style={{ color: th.modalLabel }}>{f.label}</label>
                      {f.type === 'select' ? (
                        <select value={(newClosing as any)[f.key]} onChange={e => setNewClosing({...newClosing,[f.key]:e.target.value})}
                          className={`${modalInputCls} focus:border-red-500/50`} style={modalInputStyle}>
                          {f.options?.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                      ) : f.type === 'date' ? (
                        <input type="date" value={newClosing.closingDate} onChange={e => setNewClosing({...newClosing,closingDate:e.target.value})}
                          className={`${modalInputCls} focus:border-red-500/50`} style={modalInputStyle} />
                      ) : (
                        <textarea value={newClosing.notes} onChange={e => setNewClosing({...newClosing,notes:e.target.value})}
                          rows={4} placeholder="Add notes or observations..."
                          className={`${modalInputCls} focus:border-red-500/50 resize-none`} style={modalInputStyle} />
                      )}
                    </div>
                  ))}
                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                    <div className="flex gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-400 mb-2">Important Notice</h4>
                        <ul className="text-xs text-amber-300/80 space-y-1.5">
                          {["All transactions will be locked","Financial reports will be generated from ledger","Profit = Revenue - (COGS + Purchases + Expenses)","Late-night transactions (until 6 AM) will be included","First closing includes all historical data"].map(n => (
                            <li key={n}>• {n}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              ) : user && (
                <ClosingPreview key={`${newClosing.closingType}-${newClosing.closingDate}-${user.outletId}`} closingType={newClosing.closingType} closingDate={newClosing.closingDate} outletId={user.outletId} />
              )}
            </div>
            <div className="px-6 py-4 flex justify-between gap-3 transition-colors duration-500"
              style={{ background: th.modalFtrBg, borderTop: `1px solid ${th.modalFtrBorder}` }}>
              <button onClick={() => showPreview ? setShowPreview(false) : setShowCloseModal(false)}
                className="px-6 py-2.5 rounded-xl transition-all font-medium"
                style={{ background: th.modalCancelBg, border: `1px solid ${th.modalCancelBorder}`, color: th.modalCancelText }}>
                {showPreview ? "Back" : "Cancel"}
              </button>
              <div className="flex gap-3">
                {!showPreview && (
                  <button onClick={handleShowPreview}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-medium shadow-lg shadow-blue-500/25">
                    Preview
                  </button>
                )}
                <button onClick={handleClose} disabled={isClosing}
                  className={`px-8 py-2.5 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-xl hover:from-red-500 hover:to-red-600 transition-all font-semibold shadow-lg shadow-red-500/25 ${isClosing?"opacity-50 cursor-not-allowed":""}`}>
                  {isClosing ? "Closing..." : "Close Period"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Filter Sheet ────────────────────────────────────────── */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 z-50 animate-in fade-in duration-200" style={{ background: 'rgba(0,0,0,0.90)', backdropFilter:'blur(8px)' }}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl p-6 animate-in slide-in-from-bottom  transition-colors duration-500"
            style={{ background: th.sheetBg, borderTop: `1px solid ${th.sheetBorder}` }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: th.sheetTitle }}>Filters</h2>
              <button onClick={() => setShowFilters(false)} className="p-2 rounded-lg active:scale-95 transition-all"
                style={{ background: th.sheetCloseBg, color: th.sheetCloseText }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5">
              {[{label:'Period Type',key:'type',val:filterType,set:setFilterType,opts:[{v:'all',l:'All Periods'},{v:'day',l:'Daily'},{v:'month',l:'Monthly'}]},
                {label:'Status',key:'status',val:filterStatus,set:setFilterStatus,opts:[{v:'all',l:'All Status'},{v:'closed',l:'Closed'},{v:'locked',l:'Locked'},{v:'pending',l:'Pending'}]}
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-3" style={{ color: th.sheetLabelText }}>{f.label}</label>
                  <select value={f.val} onChange={e => f.set(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all"
                    style={{ background: th.sheetInputBg, border: `1px solid ${th.sheetInputBorder}`, color: th.sheetInputText }}>
                    {f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
              ))}
              <div className="flex gap-3 pt-4">
                <button onClick={() => { clearFilters(); setShowFilters(false); }}
                  className="flex-1 px-4 py-3 rounded-xl transition-all active:scale-95 font-medium"
                  style={{ background: th.sheetClearBg, border: `1px solid ${th.sheetClearBorder}`, color: th.sheetClearText }}>
                  Clear
                </button>
                <button onClick={() => setShowFilters(false)}
                  className="flex-1 px-4 py-3 bg-gradient-to-br from-red-600 to-red-700 rounded-xl text-white font-semibold active:scale-95 transition-all shadow-lg shadow-red-500/25">
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Action Menu ─────────────────────────────────────────── */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 z-50 animate-in fade-in duration-200" style={{ background: 'rgba(0,0,0,0.90)', backdropFilter:'blur(8px)' }}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl p-6 animate-in slide-in-from-bottom  transition-colors duration-500"
            style={{ background: th.sheetBg, borderTop: `1px solid ${th.sheetBorder}` }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: th.sheetTitle }}>Actions</h2>
              <button onClick={() => setShowMobileMenu(false)} className="p-2 rounded-lg active:scale-95 transition-all"
                style={{ background: th.sheetCloseBg, color: th.sheetCloseText }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label:'Close Period',  icon:<Lock className="h-5 w-5" />,      onClick:() => { setShowCloseModal(true); setShowMobileMenu(false); } },
                { label:'Export CSV',    icon:<Download className="h-5 w-5" />,   onClick:downloadClosingsCSV },
                { label:'Refresh Data',  icon:<RefreshCw className="h-5 w-5" />,  onClick:() => { fetchClosings(); setShowMobileMenu(false); toast.success("Closings refreshed"); } },
              ].map(a => (
                <button key={a.label} onClick={a.onClick}
                  className="w-full p-4 rounded-xl font-semibold transition-all flex items-center justify-between active:scale-95"
                  style={{ background: th.sheetItemBg, border: `1px solid ${th.sheetItemBorder}`, color: th.sheetItemText }}>
                  <span>{a.label}</span>{a.icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}