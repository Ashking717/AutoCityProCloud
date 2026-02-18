'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Search, Plus, ChevronLeft, TrendingUp, TrendingDown, Package,
  Calendar, Filter, Download, FileText, ShoppingCart, RefreshCw,
  ArrowUpRight, ArrowDownRight, Warehouse, Sun, Moon,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

interface Movement {
  _id: string;
  productName: string;
  sku: string;
  movementType: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  referenceType: string;
  referenceNumber: string;
  balanceAfter: number;
  date: string;
  notes?: string;
  ledgerEntriesCreated: boolean;
  createdBy?: {
    name: string;
    email: string;
  };
}

export default function InventoryMovementsPage() {
  const router = useRouter();
  const isDark = useTimeBasedTheme();

  const [user, setUser] = useState<any>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isMobile, setIsMobile] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    pageBg:             isDark ? "#050505"                                          : "#f3f4f6",
    headerBgFrom:       isDark ? "#932222"                                          : "#fef2f2",
    headerBgVia:        isDark ? "#411010"                                          : "#fee2e2",
    headerBgTo:         isDark ? "#a20c0c"                                          : "#fecaca",
    headerBorder:       isDark ? "rgba(255,255,255,0.05)"                           : "rgba(0,0,0,0.06)",
    headerTitle:        isDark ? "#ffffff"                                          : "#7f1d1d",
    headerSub:          isDark ? "rgba(255,255,255,0.80)"                           : "#991b1b",
    headerIconBg:       isDark ? "rgba(255,255,255,0.10)"                           : "rgba(127,29,29,0.10)",
    headerIconBorder:   isDark ? "rgba(255,255,255,0.20)"                           : "rgba(127,29,29,0.20)",
    headerBtnBg:        isDark ? "rgba(255,255,255,0.10)"                           : "rgba(127,29,29,0.10)",
    headerBtnText:      isDark ? "#ffffff"                                          : "#7f1d1d",
    headerBtnHover:     isDark ? "rgba(255,255,255,0.20)"                           : "rgba(127,29,29,0.15)",
    headerBtnBorder:    isDark ? "rgba(255,255,255,0.20)"                           : "rgba(127,29,29,0.20)",
    mobileHdrBg:        isDark ? "linear-gradient(to br,#0A0A0A,#050505,#0A0A0A)"  : "linear-gradient(to br,#ffffff,#f9fafb,#ffffff)",
    mobileHdrBorder:    isDark ? "rgba(255,255,255,0.05)"                           : "rgba(0,0,0,0.08)",
    mobileHdrTitle:     isDark ? "#ffffff"                                          : "#111827",
    mobileHdrSub:       isDark ? "rgba(255,255,255,0.60)"                           : "#6b7280",
    mobileBtnBg:        isDark ? "rgba(255,255,255,0.05)"                           : "rgba(0,0,0,0.05)",
    mobileBtnText:      isDark ? "rgba(255,255,255,0.80)"                           : "#374151",
    mobileBtnHover:     isDark ? "rgba(255,255,255,0.10)"                           : "rgba(0,0,0,0.08)",
    searchBg:           isDark ? "rgba(255,255,255,0.05)"                           : "#ffffff",
    searchBorder:       isDark ? "rgba(255,255,255,0.10)"                           : "rgba(0,0,0,0.10)",
    searchText:         isDark ? "#ffffff"                                          : "#111827",
    searchPlaceholder:  isDark ? "rgba(255,255,255,0.40)"                           : "#9ca3af",
    searchIcon:         isDark ? "rgba(255,255,255,0.40)"                           : "#9ca3af",
    filterBtnActiveBg:  isDark ? "#E84545"                                          : "#E84545",
    filterBtnActiveText:isDark ? "#ffffff"                                          : "#ffffff",
    filterBtnBg:        isDark ? "rgba(255,255,255,0.05)"                           : "rgba(0,0,0,0.05)",
    filterBtnText:      isDark ? "rgba(255,255,255,0.60)"                           : "#6b7280",
    filterBtnHover:     isDark ? "rgba(255,255,255,0.10)"                           : "rgba(0,0,0,0.08)",
    filterBtnDesktopActive:isDark ? "#ffffff"                                       : "#7f1d1d",
    filterBtnDesktopActiveText:isDark ? "#932222"                                   : "#ffffff",
    statCardBg:         isDark ? "linear-gradient(to br,#0A0A0A,#050505)"          : "#ffffff",
    statCardBorder:     isDark ? "rgba(255,255,255,0.10)"                           : "rgba(0,0,0,0.08)",
    statLabel:          isDark ? "#9ca3af"                                          : "#6b7280",
    statValue:          isDark ? "#ffffff"                                          : "#111827",
    statValueGreen:     isDark ? "#86efac"                                          : "#15803d",
    statValueRed:       isDark ? "#f87171"                                          : "#dc2626",
    mainCardBg:         isDark ? "linear-gradient(to br,#0A0A0A,#050505)"          : "#ffffff",
    mainCardBorder:     isDark ? "rgba(255,255,255,0.10)"                           : "rgba(0,0,0,0.08)",
    tblHdrBg:           isDark ? "#050505"                                          : "#f9fafb",
    tblHdrText:         isDark ? "#cbd5e1"                                          : "#6b7280",
    tblRowHover:        isDark ? "rgba(255,255,255,0.05)"                           : "rgba(0,0,0,0.02)",
    tblRowBorder:       isDark ? "rgba(255,255,255,0.10)"                           : "rgba(0,0,0,0.08)",
    tblCellName:        isDark ? "#ffffff"                                          : "#111827",
    tblCellCode:        isDark ? "#64748b"                                          : "#9ca3af",
    tblCellText:        isDark ? "#cbd5e1"                                          : "#374151",
    badgePurchaseBg:    isDark ? "rgba(34,197,94,0.10)"                             : "rgba(34,197,94,0.06)",
    badgePurchaseText:  isDark ? "#86efac"                                          : "#15803d",
    badgePurchaseBorder:isDark ? "rgba(34,197,94,0.20)"                             : "rgba(34,197,94,0.20)",
    badgeSaleBg:        isDark ? "rgba(239,68,68,0.10)"                             : "rgba(239,68,68,0.06)",
    badgeSaleText:      isDark ? "#f87171"                                          : "#dc2626",
    badgeSaleBorder:    isDark ? "rgba(239,68,68,0.20)"                             : "rgba(239,68,68,0.20)",
    badgeAdjustBg:      isDark ? "rgba(234,179,8,0.10)"                             : "rgba(234,179,8,0.06)",
    badgeAdjustText:    isDark ? "#fde047"                                          : "#a16207",
    badgeAdjustBorder:  isDark ? "rgba(234,179,8,0.20)"                             : "rgba(234,179,8,0.20)",
    badgeReturnBg:      isDark ? "rgba(59,130,246,0.10)"                            : "rgba(59,130,246,0.06)",
    badgeReturnText:    isDark ? "#93c5fd"                                          : "#1d4ed8",
    badgeReturnBorder:  isDark ? "rgba(59,130,246,0.20)"                            : "rgba(59,130,246,0.20)",
    glPostedText:       isDark ? "#86efac"                                          : "#15803d",
    emptyIcon:          isDark ? "#475569"                                          : "#d1d5db",
    emptyText:          isDark ? "#9ca3af"                                          : "#6b7280",
    emptySubtext:       isDark ? "#64748b"                                          : "#9ca3af",
    islandBg:           isDark ? "#000000"                                          : "#ffffff",
    islandBorder:       isDark ? "rgba(255,255,255,0.10)"                           : "rgba(0,0,0,0.10)",
    islandText:         isDark ? "#ffffff"                                          : "#111827",
    islandDivider:      isDark ? "rgba(255,255,255,0.20)"                           : "rgba(0,0,0,0.10)",
  };

  useEffect(() => {
    fetchUser();
    fetchMovements();
    const checkIfMobile = () => setIsMobile(window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, [filterType]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) setUser((await res.json()).user);
    } catch {}
  };

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const url = filterType === 'ALL' ? '/api/inventory-movements' : `/api/inventory-movements?movementType=${filterType}`;
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMovements(data.movements || []);
        setStats(data.stats || []);
      }
    } catch {
      toast.error('Failed to load inventory movements');
    } finally {
      setLoading(false);
    }
  };

  const filteredMovements = movements.filter(m =>
    m.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE': return <ShoppingCart className="h-4 w-4" />;
      case 'SALE': return <FileText className="h-4 w-4" />;
      case 'ADJUSTMENT': return <RefreshCw className="h-4 w-4" />;
      case 'RETURN': return <ArrowDownRight className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getMovementColor = (type: string) => {
    const map: Record<string, { bg: string; text: string; border: string }> = {
      PURCHASE: { bg: th.badgePurchaseBg, text: th.badgePurchaseText, border: th.badgePurchaseBorder },
      SALE: { bg: th.badgeSaleBg, text: th.badgeSaleText, border: th.badgeSaleBorder },
      ADJUSTMENT: { bg: th.badgeAdjustBg, text: th.badgeAdjustText, border: th.badgeAdjustBorder },
      RETURN: { bg: th.badgeReturnBg, text: th.badgeReturnText, border: th.badgeReturnBorder },
    };
    return map[type] || { bg: th.statCardBg, text: th.tblCellText, border: th.tblRowBorder };
  };

  const totalIn = stats.filter(s => ['PURCHASE', 'RETURN'].includes(s._id)).reduce((sum, s) => sum + s.totalValue, 0);
  const totalOut = stats.filter(s => ['SALE'].includes(s._id)).reduce((sum, s) => sum + Math.abs(s.totalValue), 0);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="rounded-[28px] px-6 py-3 shadow-2xl backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500 transition-colors"
              style={{ background: th.islandBg, border: `1px solid ${th.islandBorder}` }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Package className="h-3 w-3 text-[#E84545]" />
                  <span className="text-xs font-semibold" style={{ color: th.islandText }}>{filteredMovements.length}</span>
                </div>
                <div className="h-3 w-px" style={{ background: th.islandDivider }}></div>
                <span className="text-xs font-medium" style={{ color: th.islandText }}>Movements</span>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 backdrop-blur-xl transition-colors duration-500"
          style={{ background: th.mobileHdrBg, borderBottom: `1px solid ${th.mobileHdrBorder}` }}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: th.mobileHdrTitle }}>
                    Inventory
                    {isDark ? <Moon className="h-4 w-4 text-[#E84545]" /> : <Sun className="h-4 w-4 text-[#E84545]" />}
                  </h1>
                  <p className="text-xs" style={{ color: th.mobileHdrSub }}>{filteredMovements.length} movements</p>
                </div>
              </div>
              <button onClick={() => fetchMovements()}
                className="p-2 rounded-xl text-white active:scale-95 transition-all"
                style={{ background: "linear-gradient(to r,#E84545,#cc3c3c)" }}>
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile Search Bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: th.searchIcon }} />
              <input type="text" placeholder="Search movements..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm transition-colors duration-300"
                style={{ background: th.searchBg, border: `1px solid ${th.searchBorder}`, color: th.searchText }} />
            </div>

            {/* Mobile Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {['ALL', 'PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN'].map((type) => (
                <button key={type} onClick={() => setFilterType(type)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
                  style={{ 
                    background: filterType === type ? th.filterBtnActiveBg : th.filterBtnBg,
                    color: filterType === type ? th.filterBtnActiveText : th.filterBtnText
                  }}
                  onMouseEnter={e => filterType !== type && (e.currentTarget.style.background = th.filterBtnHover)}
                  onMouseLeave={e => filterType !== type && (e.currentTarget.style.background = th.filterBtnBg)}>
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-3 border-b shadow-lg transition-colors duration-500"
          style={{ background: `linear-gradient(to br,${th.headerBgFrom},${th.headerBgVia},${th.headerBgTo})`, borderColor: th.headerBorder }}>
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl backdrop-blur-sm transition-colors"
                  style={{ background: th.headerIconBg, border: `1px solid ${th.headerIconBorder}` }}>
                  <Warehouse className="h-8 w-8" style={{ color: th.headerTitle }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold" style={{ color: th.headerTitle }}>Inventory Movements</h1>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                      style={{ background: isDark ? "rgba(0,0,0,0.30)" : "rgba(255,255,255,0.60)", border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(127,29,29,0.20)"}`, color: isDark ? "rgba(255,255,255,0.70)" : "#7f1d1d" }}>
                      {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                    </div>
                  </div>
                  <p className="mt-1" style={{ color: th.headerSub }}>{filteredMovements.length} movements found</p>
                </div>
              </div>
              <div className="flex gap-3">
                {[
                  { icon: <RefreshCw className="h-4 w-4" />, label: 'Refresh', action: fetchMovements },
                  { icon: <Download className="h-4 w-4" />, label: 'Export', action: () => toast.success('Export coming soon!') }
                ].map((btn, i) => (
                  <button key={i} onClick={btn.action}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
                    style={{ background: th.headerBtnBg, color: th.headerBtnText, border: `1px solid ${th.headerBtnBorder}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = th.headerBtnHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = th.headerBtnBg)}>
                    {btn.icon}<span>{btn.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop Search & Filter */}
            <div className="mt-6 flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: th.searchIcon }} />
                <input type="text" placeholder="Search by product, SKU, or reference..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl pl-12 pr-4 py-3 backdrop-blur-sm transition-colors duration-300"
                  style={{ background: th.searchBg, border: `1px solid ${th.searchBorder}`, color: th.searchText }} />
              </div>
              <div className="flex gap-2">
                {['ALL', 'PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN'].map((type) => (
                  <button key={type} onClick={() => setFilterType(type)}
                    className="px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: filterType === type ? th.filterBtnDesktopActive : th.headerBtnBg,
                      color: filterType === type ? th.filterBtnDesktopActiveText : th.headerBtnText,
                      border: filterType === type ? 'none' : `1px solid ${th.headerBtnBorder}`
                    }}
                    onMouseEnter={e => filterType !== type && (e.currentTarget.style.background = th.headerBtnHover)}
                    onMouseLeave={e => filterType !== type && (e.currentTarget.style.background = th.headerBtnBg)}>
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[260px] md:pt-6 pb-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            {[
              { icon: <Package className="h-5 w-5 text-[#E84545]" />, label: "Total Movements", value: movements.length, bg: "rgba(232,69,69,0.10)" },
              { icon: <TrendingUp className="h-5 w-5" style={{ color: th.statValueGreen }} />, label: "Stock In Value", value: `QAR ${totalIn.toLocaleString()}`, color: th.statValueGreen, bg: isDark ? "rgba(34,197,94,0.10)" : "rgba(34,197,94,0.08)" },
              { icon: <TrendingDown className="h-5 w-5" style={{ color: th.statValueRed }} />, label: "Stock Out Value", value: `QAR ${totalOut.toLocaleString()}`, color: th.statValueRed, bg: isDark ? "rgba(239,68,68,0.10)" : "rgba(239,68,68,0.08)" },
              { icon: <FileText className="h-5 w-5" style={{ color: isDark ? "#60a5fa" : "#2563eb" }} />, label: "Net Movement", value: `QAR ${(totalIn - totalOut).toLocaleString()}`, color: totalIn - totalOut >= 0 ? th.statValueGreen : th.statValueRed, bg: isDark ? "rgba(59,130,246,0.10)" : "rgba(59,130,246,0.08)" },
            ].map((stat, i) => (
              <div key={i} className="rounded-2xl p-4 transition-colors duration-500"
                style={{ background: th.statCardBg, border: `1px solid ${th.statCardBorder}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl" style={{ background: stat.bg }}>{stat.icon}</div>
                </div>
                <p className="text-xs mb-1" style={{ color: th.statLabel }}>{stat.label}</p>
                <p className="text-xl font-bold" style={{ color: stat.color || th.statValue }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Movements List */}
          <div className="rounded-2xl overflow-hidden transition-colors duration-500"
            style={{ background: th.mainCardBg, border: `1px solid ${th.mainCardBorder}` }}>
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E84545] mx-auto mb-4"></div>
                <p style={{ color: th.emptyText }}>Loading movements...</p>
              </div>
            ) : filteredMovements.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="h-16 w-16 mx-auto mb-4" style={{ color: th.emptyIcon }} />
                <p className="text-lg mb-2" style={{ color: th.emptyText }}>No movements found</p>
                <p className="text-sm" style={{ color: th.emptySubtext }}>Try adjusting your filters or search</p>
              </div>
            ) : (
              <div style={{ borderTop: `1px solid ${th.tblRowBorder}` }}>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead style={{ background: th.tblHdrBg }}>
                      <tr>
                        {["Product","Type","Quantity","Unit Cost","Total Value","Balance","Reference","Date"].map(h => (
                          <th key={h} className={`px-6 py-3 ${['Quantity','Unit Cost','Total Value','Balance'].includes(h) ? 'text-right' : 'text-left'} text-xs font-semibold uppercase`}
                            style={{ color: th.tblHdrText }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMovements.map((movement) => {
                        const colors = getMovementColor(movement.movementType);
                        return (
                          <tr key={movement._id} className="transition-colors"
                            style={{ borderTop: `1px solid ${th.tblRowBorder}` }}
                            onMouseEnter={e => (e.currentTarget.style.background = th.tblRowHover)}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <td className="px-6 py-4">
                              <p className="text-sm font-semibold" style={{ color: th.tblCellName }}>{movement.productName}</p>
                              <p className="text-xs" style={{ color: th.tblCellCode }}>SKU: {movement.sku}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border"
                                style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}>
                                {getMovementIcon(movement.movementType)}{movement.movementType}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-sm font-bold" style={{ color: movement.quantity > 0 ? th.statValueGreen : th.statValueRed }}>
                                {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-sm" style={{ color: th.tblCellText }}>QAR {movement.unitCost.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-sm font-semibold" style={{ color: movement.totalValue >= 0 ? th.statValueGreen : th.statValueRed }}>
                                QAR {Math.abs(movement.totalValue).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-sm font-bold" style={{ color: isDark ? "#60a5fa" : "#2563eb" }}>{movement.balanceAfter}</span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs" style={{ color: th.tblCellCode }}>{movement.referenceType}</p>
                              <p className="text-sm font-mono" style={{ color: th.tblCellName }}>{movement.referenceNumber}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs" style={{ color: th.tblCellCode }}>{formatDate(movement.date)}</p>
                              {movement.ledgerEntriesCreated && (
                                <span className="inline-flex items-center gap-1 text-xs mt-1" style={{ color: th.glPostedText }}>
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: th.glPostedText }}></div>Posted to GL
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden">
                  {filteredMovements.map((movement) => {
                    const colors = getMovementColor(movement.movementType);
                    return (
                      <div key={movement._id} className="p-4 transition-all active:scale-[0.98]"
                        style={{ borderTop: `1px solid ${th.tblRowBorder}` }}
                        onMouseEnter={e => (e.currentTarget.style.background = th.tblRowHover)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold truncate" style={{ color: th.tblCellName }}>{movement.productName}</h3>
                            <p className="text-xs" style={{ color: th.tblCellCode }}>SKU: {movement.sku}</p>
                          </div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border"
                            style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}>
                            {getMovementIcon(movement.movementType)}{movement.movementType}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <p className="text-xs mb-1" style={{ color: th.tblCellCode }}>Quantity</p>
                            <p className="text-sm font-bold" style={{ color: movement.quantity > 0 ? th.statValueGreen : th.statValueRed }}>
                              {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs mb-1" style={{ color: th.tblCellCode }}>Balance After</p>
                            <p className="text-sm font-bold" style={{ color: isDark ? "#60a5fa" : "#2563eb" }}>{movement.balanceAfter}</p>
                          </div>
                          <div>
                            <p className="text-xs mb-1" style={{ color: th.tblCellCode }}>Unit Cost</p>
                            <p className="text-sm" style={{ color: th.tblCellName }}>QAR {movement.unitCost.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs mb-1" style={{ color: th.tblCellCode }}>Total Value</p>
                            <p className="text-sm font-semibold" style={{ color: movement.totalValue >= 0 ? th.statValueGreen : th.statValueRed }}>
                              QAR {Math.abs(movement.totalValue).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${th.tblRowBorder}` }}>
                          <div>
                            <p className="text-xs" style={{ color: th.tblCellCode }}>Reference</p>
                            <p className="text-xs font-mono" style={{ color: th.tblCellName }}>{movement.referenceNumber}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs" style={{ color: th.tblCellCode }}>{formatDate(movement.date)}</p>
                            {movement.ledgerEntriesCreated && (
                              <span className="inline-flex items-center gap-1 text-xs mt-1" style={{ color: th.glPostedText }}>
                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: th.glPostedText }}></div>GL Posted
                              </span>
                            )}
                          </div>
                        </div>
                        {movement.notes && (
                          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${th.tblRowBorder}` }}>
                            <p className="text-xs mb-1" style={{ color: th.tblCellCode }}>Notes</p>
                            <p className="text-xs" style={{ color: th.tblCellText }}>{movement.notes}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Safe Area Bottom Padding */}
        <div className="md:hidden h-24"></div>
      </div>
    </MainLayout>
  );
}