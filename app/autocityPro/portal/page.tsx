'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  ShoppingBag, CreditCard, ArrowRight, Package, Receipt,
  TrendingUp, BarChart3, DollarSign, FileText, PlusCircle,
  History, Settings, Users, Calendar, Tag, Truck, Grid,
  UserPlus, Layers, FolderPlus, ClipboardList, Search,
  Filter, X, MoreVertical, ChevronLeft, FileDown,
  AlertTriangle, Zap, TrendingDown, Sun, Moon,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Time-based theme hook ────────────────────────────────────────────────────
function useTimeBasedTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => {
      const hour = new Date().getHours();
      setIsDark(hour < 6 || hour >= 18);
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);
  return isDark;
}

export default function PurchasesPortalPage() {
  const router = useRouter();
  const isDark = useTimeBasedTheme();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quickActions] = useState([
    { id: 1, title: "New Purchase",             shortTitle: "Purchase",   description: "Add new inventory purchase",       icon: ShoppingBag,   gradient: "from-[#E84545] to-[#cc3c3c]",      href: "/autocityPro/purchases/new",             shortcut: "Ctrl+P" },
    { id: 2, title: "View/Record Expense",       shortTitle: "Expense",    description: "Record business expense",          icon: CreditCard,    gradient: "from-purple-500 to-pink-600",        href: "/autocityPro/expenses",                  shortcut: "Ctrl+E" },
    { id: 3, title: "Manage Categories",         shortTitle: "Categories", description: "Add/edit product categories",      icon: Tag,           gradient: "from-blue-500 to-cyan-600",          href: "/autocityPro/categories",                shortcut: "Ctrl+C" },
    { id: 4, title: "Manage Suppliers",          shortTitle: "Suppliers",  description: "Add/edit supplier information",    icon: Truck,         gradient: "from-orange-500 to-red-600",         href: "/autocityPro/suppliers",                 shortcut: "Ctrl+S" },
    { id: 5, title: "View Purchases",            shortTitle: "History",    description: "Browse purchase history",          icon: History,       gradient: "from-green-500 to-emerald-600",      href: "/autocityPro/purchases",                 shortcut: "Ctrl+Shift+P" },
    { id: 6, title: "Inventory Movements",       shortTitle: "Movements",  description: "Track inventory movements",        icon: Package,       gradient: "from-blue-500 to-cyan-600",          href: "/autocityPro/inventory-movements",        shortcut: "Ctrl+M" },
    { id: 7, title: "Activity Logs",             shortTitle: "Activity",   description: "View system activity logs",        icon: ClipboardList, gradient: "from-indigo-500 to-purple-600",      href: "/autocityPro/activity-logs",             shortcut: "Ctrl+L" },
  ]);
  const [stats, setStats] = useState({ totalPurchases: 0, totalExpenses: 0, pendingBills: 0, todayPurchases: 0, totalCategories: 0, totalSuppliers: 0, activeSuppliers: 0 });
  const [recentCategories,    setRecentCategories]    = useState<any[]>([]);
  const [topSuppliers,        setTopSuppliers]        = useState<any[]>([]);
  const [recentTransactions,  setRecentTransactions]  = useState<any[]>([]);
  const [searchTerm,          setSearchTerm]          = useState("");
  const [showFilters,         setShowFilters]         = useState(false);
  const [filterType,          setFilterType]          = useState<string>("all");
  const [isMobile,            setIsMobile]            = useState(false);
  const [showMobileMenu,      setShowMobileMenu]      = useState(false);
  const [showDynamicIsland,   setShowDynamicIsland]   = useState(true);

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    pageBg:          isDark ? '#050505'                                                   : '#f3f4f6',
    // Header
    headerBgFrom:    isDark ? '#932222'                                                   : '#fef2f2',
    headerBgVia:     isDark ? '#411010'                                                   : '#fee2e2',
    headerBgTo:      isDark ? '#a20c0c'                                                   : '#fecaca',
    headerBorder:    isDark ? 'rgba(255,255,255,0.05)'                                    : 'rgba(0,0,0,0.06)',
    headerTitle:     isDark ? '#ffffff'                                                   : '#7f1d1d',
    headerSub:       isDark ? 'rgba(255,255,255,0.80)'                                    : '#991b1b',
    // CSV buttons in header
    csvBtnBg:        isDark ? 'rgba(255,255,255,0.10)'                                    : 'rgba(0,0,0,0.08)',
    csvBtnBorder:    isDark ? 'rgba(255,255,255,0.20)'                                    : 'rgba(0,0,0,0.15)',
    csvBtnText:      isDark ? '#ffffff'                                                   : '#7f1d1d',
    csvBtnHoverBg:   isDark ? 'rgba(255,255,255,0.20)'                                    : 'rgba(0,0,0,0.14)',
    // Mobile header
    mobileHeaderBg:  isDark ? 'linear-gradient(135deg,#0A0A0A,#050505,#0A0A0A)'           : 'linear-gradient(135deg,#ffffff,#f9fafb,#ffffff)',
    mobileHeaderBorder: isDark ? 'rgba(255,255,255,0.05)'                                : 'rgba(0,0,0,0.08)',
    mobileHeaderTitle: isDark ? '#ffffff'                                                 : '#111827',
    mobileHeaderSub: isDark ? 'rgba(255,255,255,0.60)'                                   : '#6b7280',
    mobileBtnBg:     isDark ? 'rgba(255,255,255,0.05)'                                   : 'rgba(0,0,0,0.05)',
    mobileBtnText:   isDark ? 'rgba(255,255,255,0.80)'                                   : '#374151',
    mobileSearchBg:  isDark ? 'rgba(255,255,255,0.10)'                                   : 'rgba(0,0,0,0.06)',
    mobileSearchBorder: isDark ? 'rgba(255,255,255,0.20)'                                : 'rgba(0,0,0,0.12)',
    mobileSearchText:   isDark ? '#ffffff'                                               : '#111827',
    mobileSearchPlaceholder: isDark ? 'rgba(255,255,255,0.70)'                           : '#9ca3af',
    // Desktop search bar
    searchBg:        isDark ? '#0A0A0A'                                                  : '#ffffff',
    searchBorder:    isDark ? 'rgba(255,255,255,0.10)'                                   : 'rgba(0,0,0,0.10)',
    searchText:      isDark ? '#ffffff'                                                  : '#111827',
    searchPlaceholder: isDark ? '#9ca3af'                                                : '#6b7280',
    filterBtnBg:     isDark ? 'transparent'                                              : 'transparent',
    filterBtnBorder: isDark ? 'rgba(255,255,255,0.10)'                                   : 'rgba(0,0,0,0.10)',
    filterBtnText:   isDark ? '#ffffff'                                                  : '#374151',
    filterActiveBg:  isDark ? 'rgba(232,69,69,0.20)'                                     : 'rgba(232,69,69,0.10)',
    filterBorder2:   isDark ? 'rgba(255,255,255,0.10)'                                   : 'rgba(0,0,0,0.08)',
    filterLabel:     isDark ? '#d1d5db'                                                  : '#374151',
    selectBg:        isDark ? '#0A0A0A'                                                  : '#ffffff',
    selectBorder:    isDark ? 'rgba(255,255,255,0.10)'                                   : 'rgba(0,0,0,0.10)',
    selectText:      isDark ? '#ffffff'                                                  : '#111827',
    clearBtnBg:      isDark ? 'rgba(232,69,69,0.10)'                                     : 'rgba(232,69,69,0.07)',
    clearBtnBorder:  isDark ? 'rgba(232,69,69,0.30)'                                     : 'rgba(232,69,69,0.25)',
    // Stat cards
    cardBgFrom:      isDark ? '#0A0A0A'                                                  : '#ffffff',
    cardBgTo:        isDark ? '#050505'                                                  : '#f9fafb',
    cardBorder:      isDark ? 'rgba(255,255,255,0.10)'                                   : 'rgba(0,0,0,0.08)',
    cardLabel:       isDark ? '#9ca3af'                                                  : '#6b7280',
    cardValue:       isDark ? '#ffffff'                                                  : '#111827',
    // Quick Actions
    sectionTitle:    isDark ? '#ffffff'                                                  : '#111827',
    sectionSub:      isDark ? '#9ca3af'                                                  : '#6b7280',
    actionCardBgFrom: isDark ? '#0A0A0A'                                                 : '#ffffff',
    actionCardBgTo:  isDark ? '#050505'                                                  : '#f9fafb',
    actionCardBorder: isDark ? 'rgba(255,255,255,0.10)'                                  : 'rgba(0,0,0,0.08)',
    actionCardHoverBorder: isDark ? 'rgba(255,255,255,0.20)'                             : 'rgba(0,0,0,0.14)',
    actionCardTitle: isDark ? '#ffffff'                                                  : '#111827',
    actionCardDesc:  isDark ? '#9ca3af'                                                  : '#6b7280',
    kbdBg:           isDark ? '#0A0A0A'                                                  : 'rgba(0,0,0,0.06)',
    kbdBorder:       isDark ? 'rgba(255,255,255,0.10)'                                   : 'rgba(0,0,0,0.10)',
    kbdText:         isDark ? '#9ca3af'                                                  : '#6b7280',
    // Tables
    tableBgFrom:     isDark ? '#0A0A0A'                                                  : '#ffffff',
    tableBgTo:       isDark ? '#050505'                                                  : '#f9fafb',
    tableBorder:     isDark ? 'rgba(255,255,255,0.10)'                                   : 'rgba(0,0,0,0.08)',
    tableHeadBg:     isDark ? '#050505'                                                  : '#f3f4f6',
    tableHeadText:   isDark ? '#9ca3af'                                                  : '#6b7280',
    tableDivider:    isDark ? 'rgba(255,255,255,0.05)'                                   : 'rgba(0,0,0,0.06)',
    tableRowHover:   isDark ? 'rgba(255,255,255,0.02)'                                   : 'rgba(0,0,0,0.02)',
    tableCellPrimary: isDark ? '#ffffff'                                                 : '#111827',
    tableCellSecondary: isDark ? '#d1d5db'                                               : '#374151',
    emptyIcon:       isDark ? '#4b5563'                                                  : '#d1d5db',
    emptyText:       isDark ? '#9ca3af'                                                  : '#6b7280',
    // Section headings
    addBtnText:      '#E84545',
    // Mobile card rows
    mobileRowHover:  isDark ? 'rgba(255,255,255,0.02)'                                   : 'rgba(0,0,0,0.02)',
    mobileRowActive: isDark ? 'rgba(255,255,255,0.05)'                                   : 'rgba(0,0,0,0.05)',
    mobileCardLabel: isDark ? '#6b7280'                                                  : '#9ca3af',
    mobileCardValue: isDark ? '#d1d5db'                                                  : '#374151',
    // Dynamic island
    islandBg:        isDark ? '#000000'                                                  : '#ffffff',
    islandBorder:    isDark ? 'rgba(255,255,255,0.10)'                                   : 'rgba(0,0,0,0.10)',
    islandText:      isDark ? '#ffffff'                                                  : '#111827',
    islandDivider:   isDark ? 'rgba(255,255,255,0.20)'                                   : 'rgba(0,0,0,0.12)',
    // Mobile menus / modals
    modalBg:         isDark ? 'linear-gradient(180deg,#0A0A0A,#050505)'                  : 'linear-gradient(180deg,#ffffff,#f9fafb)',
    modalBorder:     isDark ? 'rgba(255,255,255,0.10)'                                   : 'rgba(0,0,0,0.08)',
    modalTitle:      isDark ? '#ffffff'                                                  : '#111827',
    modalCloseBg:    isDark ? 'rgba(255,255,255,0.05)'                                   : 'rgba(0,0,0,0.05)',
    modalCloseText:  isDark ? '#9ca3af'                                                  : '#6b7280',
    modalItemBg:     isDark ? '#0A0A0A'                                                  : 'rgba(0,0,0,0.04)',
    modalItemBorder: isDark ? 'rgba(255,255,255,0.10)'                                   : 'rgba(0,0,0,0.08)',
    modalItemText:   isDark ? '#d1d5db'                                                  : '#374151',
  };

  useEffect(() => {
    fetchUser(); fetchStats(); fetchRecentCategories(); fetchTopSuppliers(); fetchRecentTransactions();
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      let handled = false;
      if (isCtrl && !isShift) {
        switch (e.key.toLowerCase()) {
          case "p": e.preventDefault(); router.push("/autocityPro/purchases/new"); handled = true; break;
          case "e": e.preventDefault(); router.push("/autocityPro/expenses/new");  handled = true; break;
          case "c": e.preventDefault(); router.push("/autocityPro/categories");    handled = true; break;
          case "s": e.preventDefault(); router.push("/autocityPro/suppliers");     handled = true; break;
        }
      } else if (isCtrl && isShift) {
        switch (e.key.toLowerCase()) {
          case "p": e.preventDefault(); router.push("/autocityPro/purchases");       handled = true; break;
          case "e": e.preventDefault(); router.push("/autocityPro/expenses");        handled = true; break;
          case "c": e.preventDefault(); router.push("/autocityPro/categories/new"); handled = true; break;
          case "s": e.preventDefault(); router.push("/autocityPro/suppliers/new");  handled = true; break;
        }
      }
      if (handled) toast.success("Navigating...");
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [router]);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) setUser((await res.json()).user);
    } catch {}
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/purchases/stats", { credentials: "include" });
      if (res.ok) setStats((await res.json()).stats || stats);
    } catch {}
  };

  const fetchRecentCategories = async () => {
    try {
      const res = await fetch("/api/categories?sort=createdAt&order=desc&limit=5", { credentials: "include" });
      if (res.ok) setRecentCategories((await res.json()).categories || []);
    } catch {}
  };

  const fetchTopSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers/top?limit=5", { credentials: "include" });
      if (res.ok) setTopSuppliers((await res.json()).suppliers || []);
    } catch {}
  };

  const fetchRecentTransactions = async () => {
    try {
      const [pRes, eRes] = await Promise.all([
        fetch("/api/purchases/portal?sort=createdAt&order=desc&limit=3", { credentials: "include" }),
        fetch("/api/expenses?sort=createdAt&order=desc&limit=3", { credentials: "include" }),
      ]);
      const purchases = pRes.ok ? (await pRes.json()).purchases || [] : [];
      const expenses  = eRes.ok ? (await eRes.json()).expenses  || [] : [];
      const combined = [
        ...purchases.map((p: any) => ({ id: `purchase-${p.id}`, type: 'purchase', vendor: p.supplier_name || p.vendor || 'Unknown Supplier', category: null, amount: p.amount || p.total_amount || 0, date: p.created_at || p.date || new Date().toISOString().split('T')[0], status: p.status || 'complete' })),
        ...expenses .map((e: any) => ({ id: `expense-${e.id}`,  type: 'expense',  vendor: null, category: e.category || e.expense_category || 'General', amount: e.grandTotal ?? 0, date: e.created_at || e.date || new Date().toISOString().split('T')[0], status: e.status || 'complete' })),
      ];
      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentTransactions(combined.slice(0, 5));
    } catch {}
  };

  const formatCurrency       = (n: number) => new Intl.NumberFormat('en-QA', { style: 'currency', currency: 'QAR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  const formatCompactCurrency = (n: number) => n >= 1_000_000 ? `QR${(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `QR${(n / 1_000).toFixed(1)}K` : formatCurrency(n);

  const filteredCategories    = recentCategories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredSuppliers     = topSuppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredTransactions  = recentTransactions.filter(t =>
    (t.vendor || t.category || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterType === 'all' || t.type === filterType)
  );

  const clearFilters = () => { setFilterType('all'); setSearchTerm(''); };

  const downloadCSV = (type: string) => {
    const map: Record<string, { data: any[]; headers: string[] }> = {
      categories:   { data: filteredCategories,   headers: ['Name', 'Product Count', 'Created At'] },
      suppliers:    { data: filteredSuppliers,     headers: ['Name', 'Total Purchases', 'Pending Amount', 'Rating'] },
      transactions: { data: filteredTransactions,  headers: ['Type', 'Vendor/Category', 'Amount', 'Date', 'Status'] },
    };
    const { data, headers } = map[type];
    if (!data.length) { toast.error(`No ${type} data to export`); return; }
    const csv = [headers.join(','), ...data.map(item => Object.values(item).slice(1).join(','))].join('\n');
    const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })), download: `${type}_${new Date().toISOString().split('T')[0]}.csv` });
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast.success(`Exported ${data.length} ${type} to CSV`);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/autocityPro/login';
  };

  // ── Shared table / card section renderer ─────────────────────────────────
  const SectionPanel = ({ children }: { children: React.ReactNode }) => (
    <div className="rounded-2xl shadow-xl overflow-hidden transition-colors duration-500"
      style={{
        background: `linear-gradient(135deg, ${th.tableBgFrom}, ${th.tableBgTo})`,
        border: `1px solid ${th.tableBorder}`,
      }}
    >
      {children}
    </div>
  );

  const TableHead = ({ cols }: { cols: string[] }) => (
    <thead style={{ background: th.tableHeadBg }}>
      <tr>
        {cols.map(c => (
          <th key={c} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
            style={{ color: th.tableHeadText }}
          >{c}</th>
        ))}
      </tr>
    </thead>
  );

  const EmptyRow = ({ colSpan, icon: Icon, label }: { colSpan: number; icon: any; label: string }) => (
    <tr>
      <td colSpan={colSpan} className="px-6 py-8 text-center">
        <Icon className="h-10 w-10 mx-auto mb-2" style={{ color: th.emptyIcon }} />
        <p className="text-sm" style={{ color: th.emptyText }}>{label}</p>
      </td>
    </tr>
  );

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* Dynamic Island */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="rounded-[28px] px-6 py-3 shadow-2xl backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500"
              style={{ background: th.islandBg, border: `1px solid ${th.islandBorder}` }}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-3 w-3 text-[#E84545]" />
                  <span className="text-xs font-semibold" style={{ color: th.islandText }}>{stats.totalPurchases}</span>
                </div>
                <div className="h-3 w-px" style={{ background: th.islandDivider }} />
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3 w-3 text-purple-400" />
                  <span className="text-xs font-medium" style={{ color: th.islandText }}>{formatCompactCurrency(stats.totalExpenses)}</span>
                </div>
                {stats.pendingBills > 0 && (
                  <>
                    <div className="h-3 w-px" style={{ background: th.islandDivider }} />
                    <AlertTriangle className="h-3 w-3 text-orange-500" />
                    <span className="text-xs font-medium text-orange-400">{stats.pendingBills}</span>
                  </>
                )}
                <div className="h-3 w-px" style={{ background: th.islandDivider }} />
                {isDark ? <Moon className="h-3 w-3 text-[#E84545]" /> : <Sun className="h-3 w-3 text-[#E84545]" />}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 backdrop-blur-xl transition-colors duration-500"
          style={{ background: th.mobileHeaderBg, borderBottom: `1px solid ${th.mobileHeaderBorder}` }}
        >
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()}
                  className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: th.mobileHeaderTitle }}>Purchases</h1>
                  <p className="text-xs" style={{ color: th.mobileHeaderSub }}>Manage inventory</p>
                </div>
              </div>
              <button onClick={() => setShowMobileMenu(true)}
                className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: th.mobileSearchPlaceholder }} />
              <input
                type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent transition-colors duration-500"
                style={{ background: th.mobileSearchBg, border: `1px solid ${th.mobileSearchBorder}`, color: th.mobileSearchText }}
              />
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block py-12 border-b shadow-xl transition-colors duration-500"
          style={{ background: `linear-gradient(135deg,${th.headerBgFrom},${th.headerBgVia},${th.headerBgTo})`, borderColor: th.headerBorder }}
        >
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold" style={{ color: th.headerTitle }}>Purchases, Expenses &amp; Inventory</h1>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
                    style={{ background: isDark ? 'rgba(0,0,0,0.30)' : 'rgba(255,255,255,0.60)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(127,29,29,0.20)'}`, color: isDark ? 'rgba(255,255,255,0.70)' : '#7f1d1d' }}
                  >
                    {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                  </div>
                </div>
                <p className="mt-1" style={{ color: th.headerSub }}>Manage purchases, expenses, categories, and suppliers in one place</p>
              </div>
              <div className="flex gap-3">
                {(['categories','suppliers','transactions'] as const).map(t => (
                  <button key={t} onClick={() => downloadCSV(t)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors capitalize"
                    style={{ background: th.csvBtnBg, border: `1px solid ${th.csvBtnBorder}`, color: th.csvBtnText }}
                    onMouseEnter={e => (e.currentTarget.style.background = th.csvBtnHoverBg)}
                    onMouseLeave={e => (e.currentTarget.style.background = th.csvBtnBg)}
                  >
                    <FileDown className="h-5 w-5" />
                    <span className="capitalize">{t} CSV</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[180px] md:pt-6 pb-6">

          {/* Desktop Search & Filters */}
          <div className="hidden md:block space-y-4 mb-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-5 w-5 text-[#E84545]" />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search purchases, expenses, categories, suppliers..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent transition-colors duration-500"
                  style={{ background: th.searchBg, border: `1px solid ${th.searchBorder}`, color: th.searchText }}
                />
              </div>
              <button onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
                style={{
                  background: showFilters ? th.filterActiveBg : th.filterBtnBg,
                  border: `1px solid ${showFilters ? 'rgba(232,69,69,0.30)' : th.filterBtnBorder}`,
                  color: th.filterBtnText,
                }}
              >
                <Filter className="h-5 w-5" />
                <span>Filters</span>
              </button>
            </div>
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4" style={{ borderTop: `1px solid ${th.filterBorder2}` }}>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: th.filterLabel }}>Transaction Type</label>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg transition-colors duration-500"
                    style={{ background: th.selectBg, border: `1px solid ${th.selectBorder}`, color: th.selectText }}
                  >
                    <option value="all">All Transactions</option>
                    <option value="purchase">Purchases</option>
                    <option value="expense">Expenses</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={clearFilters}
                    className="w-full px-4 py-2 rounded-lg hover:opacity-80 transition-all text-white"
                    style={{ background: th.clearBtnBg, border: `1px solid ${th.clearBtnBorder}`, color: '#E84545' }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Filter Modal */}
          {showFilters && (
            <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200">
              <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl"
                style={{ background: th.modalBg, borderColor: th.modalBorder }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold" style={{ color: th.modalTitle }}>Filters</h2>
                  <button onClick={() => setShowFilters(false)} className="p-2 rounded-xl active:scale-95 transition-all"
                    style={{ background: th.modalCloseBg, color: th.modalCloseText }}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: th.filterLabel }}>Transaction Type</label>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{ background: th.selectBg, border: `1px solid ${th.selectBorder}`, color: th.selectText }}
                    >
                      <option value="all">All Transactions</option>
                      <option value="purchase">Purchases</option>
                      <option value="expense">Expenses</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button onClick={clearFilters}
                      className="flex-1 px-4 py-3 rounded-xl active:scale-95 transition-all"
                      style={{ background: th.modalItemBg, border: `1px solid ${th.modalItemBorder}`, color: th.modalItemText }}
                    >
                      Clear
                    </button>
                    <button onClick={() => setShowFilters(false)}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-xl text-white font-semibold active:scale-95 transition-all"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            {[
              { label: 'Purchases',  value: stats.totalPurchases,                  Icon: ShoppingBag,   hoverBorder: 'rgba(232,69,69,0.30)',    gradient: 'from-[#E84545] to-[#cc3c3c]' },
              { label: 'Expenses',   value: formatCompactCurrency(stats.totalExpenses), Icon: CreditCard, hoverBorder: 'rgba(168,85,247,0.30)',  gradient: 'from-purple-500 to-pink-600' },
              { label: 'Pending',    value: stats.pendingBills,                    Icon: AlertTriangle, hoverBorder: 'rgba(249,115,22,0.30)',   gradient: 'from-orange-500 to-red-600' },
              { label: 'Today',      value: stats.todayPurchases,                  Icon: Calendar,      hoverBorder: 'rgba(59,130,246,0.30)',   gradient: 'from-blue-500 to-cyan-600' },
            ].map(({ label, value, Icon, hoverBorder, gradient }) => (
              <div key={label}
                className="rounded-2xl p-4 shadow-lg active:scale-[0.98] transition-all duration-300"
                style={{ background: `linear-gradient(135deg,${th.cardBgFrom},${th.cardBgTo})`, border: `1px solid ${th.cardBorder}` }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = hoverBorder)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = th.cardBorder)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 md:p-2.5 bg-gradient-to-r ${gradient} rounded-xl shadow-lg`}>
                    <Icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                </div>
                <p className="text-xs md:text-sm mb-1" style={{ color: th.cardLabel }}>{label}</p>
                <p className="text-xl md:text-2xl font-bold" style={{ color: th.cardValue }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-lg md:text-2xl font-bold" style={{ color: th.sectionTitle }}>Quick Actions</h2>
              <p className="hidden md:block text-sm" style={{ color: th.sectionSub }}>
                Press <kbd className="px-2 py-1 rounded text-xs" style={{ background: th.kbdBg, border: `1px solid ${th.kbdBorder}`, color: th.kbdText }}>?</kbd> for shortcuts
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              {quickActions.map(action => (
                <button key={action.id} onClick={() => router.push(action.href)}
                  className="group rounded-2xl p-4 md:p-5 text-left active:scale-[0.98] transition-all duration-300"
                  style={{ background: `linear-gradient(135deg,${th.actionCardBgFrom},${th.actionCardBgTo})`, border: `1px solid ${th.actionCardBorder}` }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = th.actionCardHoverBorder; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(232,69,69,0.05)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = th.actionCardBorder; (e.currentTarget as HTMLButtonElement).style.boxShadow = ''; }}
                >
                  <div className="flex flex-col gap-3">
                    <div className={`p-2 md:p-2.5 bg-gradient-to-r ${action.gradient} rounded-xl w-fit shadow-lg`}>
                      <action.icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm md:text-base font-semibold mb-1" style={{ color: th.actionCardTitle }}>
                        <span className="md:hidden">{action.shortTitle}</span>
                        <span className="hidden md:inline">{action.title}</span>
                      </h3>
                      <p className="text-[10px] md:text-xs line-clamp-2 mb-2 md:mb-3" style={{ color: th.actionCardDesc }}>{action.description}</p>
                      <div className="flex items-center text-[#E84545] group-hover:text-[#cc3c3c] transition-colors">
                        <span className="text-xs font-medium">Go</span>
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Categories */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold" style={{ color: th.sectionTitle }}>Recent Categories</h2>
              <button onClick={() => router.push('/autocityPro/categories/new')}
                className="flex items-center space-x-2 active:scale-95 transition-all text-[#E84545] hover:text-[#cc3c3c]"
              >
                <PlusCircle className="h-4 w-4" /><span className="text-sm">Add New</span>
              </button>
            </div>
            <SectionPanel>
              {/* Desktop table */}
              <table className="min-w-full hidden md:table" style={{ borderCollapse: 'collapse' }}>
                <TableHead cols={['Name','Product Count','Created At']} />
                <tbody>
                  {filteredCategories.length > 0 ? filteredCategories.map(cat => (
                    <tr key={cat.id} className="transition-colors" style={{ borderTop: `1px solid ${th.tableDivider}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = th.tableRowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-6 py-4 text-sm" style={{ color: th.tableCellPrimary }}>{cat.name}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: th.tableCellSecondary }}>{cat.productCount}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: th.tableCellSecondary }}>{cat.createdAt}</td>
                    </tr>
                  )) : <EmptyRow colSpan={3} icon={Tag} label="No categories found" />}
                </tbody>
              </table>
              {/* Mobile cards */}
              <div className="md:hidden">
                {filteredCategories.length > 0 ? filteredCategories.map(cat => (
                  <div key={cat.id} className="p-4 transition-colors" style={{ borderTop: `1px solid ${th.tableDivider}` }}>
                    <p className="text-sm font-medium mb-1" style={{ color: th.tableCellPrimary }}>{cat.name}</p>
                    <div className="flex items-center gap-3 text-xs" style={{ color: th.mobileCardLabel }}>
                      <span>Products: {cat.productCount}</span><span>•</span><span>{cat.createdAt}</span>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center">
                    <Tag className="h-10 w-10 mx-auto mb-2" style={{ color: th.emptyIcon }} />
                    <p className="text-sm" style={{ color: th.emptyText }}>No categories found</p>
                  </div>
                )}
              </div>
            </SectionPanel>
          </div>

          {/* Top Suppliers */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold" style={{ color: th.sectionTitle }}>Top Suppliers</h2>
              <button onClick={() => router.push('/autocityPro/suppliers/new')}
                className="flex items-center space-x-2 active:scale-95 transition-all text-[#E84545] hover:text-[#cc3c3c]"
              >
                <PlusCircle className="h-4 w-4" /><span className="text-sm">Add New</span>
              </button>
            </div>
            <SectionPanel>
              <table className="min-w-full hidden md:table" style={{ borderCollapse: 'collapse' }}>
                <TableHead cols={['Name','Total Purchases','Pending Amount','Rating']} />
                <tbody>
                  {filteredSuppliers.length > 0 ? filteredSuppliers.map(sup => (
                    <tr key={sup.id} className="transition-colors" style={{ borderTop: `1px solid ${th.tableDivider}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = th.tableRowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-6 py-4 text-sm" style={{ color: th.tableCellPrimary }}>{sup.name}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: th.tableCellSecondary }}>{formatCurrency(sup.totalPurchases)}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: th.tableCellSecondary }}>{formatCurrency(sup.pendingAmount)}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: th.tableCellSecondary }}>{sup.rating}</td>
                    </tr>
                  )) : <EmptyRow colSpan={4} icon={Truck} label="No suppliers found" />}
                </tbody>
              </table>
              <div className="md:hidden">
                {filteredSuppliers.length > 0 ? filteredSuppliers.map(sup => (
                  <div key={sup.id} className="p-4 transition-colors" style={{ borderTop: `1px solid ${th.tableDivider}` }}>
                    <p className="text-sm font-medium mb-2" style={{ color: th.tableCellPrimary }}>{sup.name}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span style={{ color: th.mobileCardLabel }}>Total:</span><p className="font-medium" style={{ color: th.mobileCardValue }}>{formatCompactCurrency(sup.totalPurchases)}</p></div>
                      <div><span style={{ color: th.mobileCardLabel }}>Pending:</span><p className="font-medium" style={{ color: th.mobileCardValue }}>{formatCompactCurrency(sup.pendingAmount)}</p></div>
                      <div><span style={{ color: th.mobileCardLabel }}>Rating:</span><p className="font-medium text-yellow-400">{sup.rating} ⭐</p></div>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center">
                    <Truck className="h-10 w-10 mx-auto mb-2" style={{ color: th.emptyIcon }} />
                    <p className="text-sm" style={{ color: th.emptyText }}>No suppliers found</p>
                  </div>
                )}
              </div>
            </SectionPanel>
          </div>

          {/* Recent Transactions */}
          <div className="mb-6 md:mb-8">
            <h2 className="text-lg md:text-xl font-bold mb-4" style={{ color: th.sectionTitle }}>Recent Transactions</h2>
            <SectionPanel>
              <table className="min-w-full hidden md:table" style={{ borderCollapse: 'collapse' }}>
                <TableHead cols={['Type','Vendor/Category','Amount','Date','Status']} />
                <tbody>
                  {filteredTransactions.length > 0 ? filteredTransactions.map(trans => (
                    <tr key={trans.id} className="transition-colors" style={{ borderTop: `1px solid ${th.tableDivider}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = th.tableRowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-6 py-4 text-sm capitalize" style={{ color: th.tableCellPrimary }}>{trans.type}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: th.tableCellSecondary }}>{trans.vendor || trans.category}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: th.tableCellSecondary }}>{formatCurrency(trans.amount)}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: th.tableCellSecondary }}>{trans.date}</td>
                      <td className="px-6 py-4 text-sm capitalize" style={{ color: th.tableCellSecondary }}>{trans.status}</td>
                    </tr>
                  )) : <EmptyRow colSpan={5} icon={History} label="No transactions found" />}
                </tbody>
              </table>
              <div className="md:hidden">
                {filteredTransactions.length > 0 ? filteredTransactions.map(trans => (
                  <div key={trans.id} className="p-4 transition-colors" style={{ borderTop: `1px solid ${th.tableDivider}` }}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium capitalize" style={{ color: th.tableCellPrimary }}>{trans.type}</p>
                        <p className="text-xs" style={{ color: th.mobileCardLabel }}>{trans.vendor || trans.category}</p>
                      </div>
                      <span className="text-sm font-bold text-[#E84545]">{formatCompactCurrency(trans.amount)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs" style={{ color: th.mobileCardLabel }}>
                      <span>{trans.date}</span><span>•</span><span className="capitalize">{trans.status}</span>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center">
                    <History className="h-10 w-10 mx-auto mb-2" style={{ color: th.emptyIcon }} />
                    <p className="text-sm" style={{ color: th.emptyText }}>No transactions found</p>
                  </div>
                )}
              </div>
            </SectionPanel>
          </div>
        </div>
      </div>

      {/* Mobile Action Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200">
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl"
            style={{ background: th.modalBg, borderColor: th.modalBorder }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: th.modalTitle }}>Actions</h2>
              <button onClick={() => setShowMobileMenu(false)} className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.modalCloseBg, color: th.modalCloseText }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {(['categories','suppliers','transactions'] as const).map(t => (
                <button key={t} onClick={() => { downloadCSV(t); setShowMobileMenu(false); }}
                  className="w-full p-4 rounded-2xl font-semibold transition-all flex items-center justify-between active:scale-95"
                  style={{ background: th.modalItemBg, border: `1px solid ${th.modalItemBorder}`, color: th.modalItemText }}
                >
                  <span className="capitalize">Export {t}</span>
                  <FileDown className="h-5 w-5" />
                </button>
              ))}
              <button onClick={() => { setShowFilters(true); setShowMobileMenu(false); }}
                className="w-full p-4 rounded-2xl font-semibold transition-all flex items-center justify-between active:scale-95"
                style={{ background: th.modalItemBg, border: `1px solid ${th.modalItemBorder}`, color: th.modalItemText }}
              >
                <span>Filters</span>
                <Filter className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="md:hidden h-24" />

      <style jsx global>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </MainLayout>
  );
}