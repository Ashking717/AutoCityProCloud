'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import {
  Activity,
  Search,
  Filter,
  X,
  ChevronLeft,
  FileDown,
  User,
  DollarSign,
  ShoppingBag,
  Package,
  Settings,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Eye,
  Clock,
  MoreVertical,
  Sun,
  Moon,
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

interface ActivityLog {
  _id: string;
  userId: string;
  username: string;
  actionType: string;
  module: string;
  description: string;
  outletId?: string;
  timestamp: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function ActivityLogsPage() {
  const router = useRouter();
  const isDark = useTimeBasedTheme();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 50,
    pages: 1,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterModule, setFilterModule] = useState<string>("all");
  const [filterActionType, setFilterActionType] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    pageBg:           isDark ? '#050505'                                              : '#f3f4f6',
    // Desktop header
    headerBgFrom:     isDark ? '#932222'                                              : '#fef2f2',
    headerBgVia:      isDark ? '#411010'                                              : '#fee2e2',
    headerBgTo:       isDark ? '#a20c0c'                                              : '#fecaca',
    headerBorder:     isDark ? 'rgba(255,255,255,0.05)'                               : 'rgba(0,0,0,0.06)',
    headerTitle:      isDark ? '#ffffff'                                              : '#7f1d1d',
    headerSub:        isDark ? 'rgba(255,255,255,0.80)'                               : '#991b1b',
    headerBtnBg:      isDark ? 'rgba(255,255,255,0.10)'                               : 'rgba(0,0,0,0.08)',
    headerBtnBorder:  isDark ? 'rgba(255,255,255,0.20)'                               : 'rgba(0,0,0,0.15)',
    headerBtnText:    isDark ? '#ffffff'                                              : '#7f1d1d',
    headerBtnHover:   isDark ? 'rgba(255,255,255,0.20)'                               : 'rgba(0,0,0,0.14)',
    // Mobile header
    mobileHeaderBg:   isDark ? 'linear-gradient(135deg,#0A0A0A,#050505,#0A0A0A)'     : 'linear-gradient(135deg,#ffffff,#f9fafb,#ffffff)',
    mobileHeaderBorder: isDark ? 'rgba(255,255,255,0.05)'                             : 'rgba(0,0,0,0.08)',
    mobileHeaderTitle:  isDark ? '#ffffff'                                            : '#111827',
    mobileHeaderSub:    isDark ? 'rgba(255,255,255,0.60)'                             : '#6b7280',
    mobileBtnBg:        isDark ? 'rgba(255,255,255,0.05)'                             : 'rgba(0,0,0,0.05)',
    mobileBtnText:      isDark ? 'rgba(255,255,255,0.80)'                             : '#374151',
    mobileSearchBg:     isDark ? 'rgba(255,255,255,0.10)'                             : 'rgba(0,0,0,0.06)',
    mobileSearchBorder: isDark ? 'rgba(255,255,255,0.20)'                             : 'rgba(0,0,0,0.12)',
    mobileSearchText:   isDark ? '#ffffff'                                            : '#111827',
    mobileSearchPH:     isDark ? 'rgba(255,255,255,0.70)'                             : '#9ca3af',
    // Main content container
    containerBg:        isDark ? 'linear-gradient(135deg,#0A0A0A,#050505)'            : 'linear-gradient(135deg,#ffffff,#f9fafb)',
    containerBorder:    isDark ? 'rgba(255,255,255,0.10)'                             : 'rgba(0,0,0,0.08)',
    // Filter panel
    filterPanelBg:      isDark ? 'rgba(255,255,255,0.05)'                             : 'rgba(0,0,0,0.03)',
    filterPanelBorder:  isDark ? 'rgba(255,255,255,0.10)'                             : 'rgba(0,0,0,0.08)',
    filterInputBg:      isDark ? '#0A0A0A'                                            : '#ffffff',
    filterInputBorder:  isDark ? 'rgba(255,255,255,0.10)'                             : 'rgba(0,0,0,0.10)',
    filterInputText:    isDark ? '#ffffff'                                            : '#111827',
    filterInputPH:      isDark ? '#64748b'                                            : '#9ca3af',
    filterLabelText:    isDark ? '#94a3b8'                                            : '#6b7280',
    // Table
    tableHeadBg:        isDark ? '#050505'                                            : '#f3f4f6',
    tableHeadText:      isDark ? '#94a3b8'                                            : '#6b7280',
    tableRowDivider:    isDark ? 'rgba(255,255,255,0.05)'                             : 'rgba(0,0,0,0.05)',
    tableRowHover:      isDark ? 'rgba(255,255,255,0.02)'                             : 'rgba(0,0,0,0.02)',
    tableCellPrimary:   isDark ? '#ffffff'                                            : '#111827',
    tableCellSecondary: isDark ? '#cbd5e1'                                            : '#374151',
    tableCellMuted:     isDark ? '#64748b'                                            : '#9ca3af',
    // Mobile cards
    mobileCardBgFrom:   isDark ? '#0A0A0A'                                            : '#ffffff',
    mobileCardBgTo:     isDark ? '#050505'                                            : '#f9fafb',
    mobileCardBorder:   isDark ? 'rgba(255,255,255,0.08)'                             : 'rgba(0,0,0,0.06)',
    mobileCardLabel:    isDark ? '#64748b'                                            : '#9ca3af',
    mobileCardDivider:  isDark ? 'rgba(255,255,255,0.07)'                             : 'rgba(0,0,0,0.06)',
    // Pagination
    paginationBg:       isDark ? 'rgba(255,255,255,0.05)'                             : 'rgba(0,0,0,0.04)',
    paginationBorder:   isDark ? 'rgba(255,255,255,0.10)'                             : 'rgba(0,0,0,0.08)',
    paginationText:     isDark ? '#ffffff'                                            : '#374151',
    paginationMuted:    isDark ? '#94a3b8'                                            : '#6b7280',
    paginationDivider:  isDark ? 'rgba(255,255,255,0.05)'                             : 'rgba(0,0,0,0.05)',
    // Mobile action menu / filter modal
    modalBg:            isDark ? 'linear-gradient(180deg,#0A0A0A,#050505)'            : 'linear-gradient(180deg,#ffffff,#f9fafb)',
    modalBorder:        isDark ? 'rgba(255,255,255,0.10)'                             : 'rgba(0,0,0,0.08)',
    modalTitle:         isDark ? '#ffffff'                                            : '#111827',
    modalCloseBg:       isDark ? 'rgba(255,255,255,0.05)'                             : 'rgba(0,0,0,0.05)',
    modalCloseText:     isDark ? '#9ca3af'                                            : '#6b7280',
    modalItemBg:        isDark ? '#0A0A0A'                                            : 'rgba(0,0,0,0.04)',
    modalItemBorder:    isDark ? 'rgba(255,255,255,0.10)'                             : 'rgba(0,0,0,0.08)',
    modalItemText:      isDark ? '#d1d5db'                                            : '#374151',
    emptyIcon:          isDark ? '#475569'                                            : '#d1d5db',
    emptyText:          isDark ? '#94a3b8'                                            : '#6b7280',
  };

  const modules = [
    "all", "sales", "purchases", "expenses", "inventory",
    "customers", "suppliers", "users", "settings",
  ];

  const actionTypes = [
    "all", "create", "update", "delete", "view",
    "login", "logout", "export", "import",
  ];

  useEffect(() => {
    fetchUser();
    fetchLogs();
    const checkIfMobile = () => setIsMobile(window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, filterModule, filterActionType, startDate, endDate]);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) setUser((await res.json()).user);
    } catch { console.error("Failed to fetch user"); }
    finally { setLoading(false); }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (searchTerm) params.append('search', searchTerm);
      if (filterModule !== 'all') params.append('module', filterModule);
      if (filterActionType !== 'all') params.append('actionType', filterActionType);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/activity-logs?${params.toString()}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setPagination(data.pagination || pagination);
      } else {
        toast.error("Failed to load activity logs");
      }
    } catch (error) {
      toast.error("Failed to fetch activity logs");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchLogs();
  };

  const clearFilters = () => {
    setFilterModule("all");
    setFilterActionType("all");
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const downloadCSV = () => {
    if (logs.length === 0) { toast.error("No activity logs to export"); return; }
    const headers = ["Username", "Action Type", "Module", "Description", "Timestamp"];
    const rows = logs.map(log => [
      log.username, log.actionType, log.module, log.description,
      new Date(log.timestamp).toLocaleString(),
    ]);
    const csvContent = [headers.join(","), ...rows.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n");
    const link = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csvContent], { type: "text/csv;charset=utf-8;" })),
      download: `activity_logs_${new Date().toISOString().split('T')[0]}.csv`,
    });
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast.success(`Exported ${logs.length} activity logs to CSV`);
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'create':  return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'update':
      case 'edit':    return <Edit className="h-4 w-4 text-blue-500" />;
      case 'delete':  return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'view':    return <Eye className="h-4 w-4 text-gray-500" />;
      case 'login':   return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'logout':  return <XCircle className="h-4 w-4 text-orange-500" />;
      default:        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getModuleIcon = (module: string) => {
    switch (module.toLowerCase()) {
      case 'sales':     return <DollarSign className="h-4 w-4" />;
      case 'purchases': return <ShoppingBag className="h-4 w-4" />;
      case 'inventory': return <Package className="h-4 w-4" />;
      case 'users':     return <User className="h-4 w-4" />;
      case 'settings':  return <Settings className="h-4 w-4" />;
      default:          return <Activity className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60)     return 'Just now';
    if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  const inputStyle = {
    background: th.filterInputBg,
    border: `1px solid ${th.filterInputBorder}`,
    color: th.filterInputText,
  };

  const mobileInputStyle = {
    background: th.modalItemBg,
    border: `1px solid ${th.modalItemBorder}`,
    color: th.modalTitle,
  };

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>

        {/* ── Mobile Header ──────────────────────────────────────────────── */}
        <div
          className="md:hidden fixed top-0 left-0 right-0 z-40 backdrop-blur-xl transition-colors duration-500"
          style={{ background: th.mobileHeaderBg, borderBottom: `1px solid ${th.mobileHeaderBorder}` }}
        >
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold" style={{ color: th.mobileHeaderTitle }}>Activity Logs</h1>
                    <div
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: isDark ? 'rgba(0,0,0,0.30)' : 'rgba(255,255,255,0.70)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
                        color: isDark ? 'rgba(255,255,255,0.70)' : '#374151',
                      }}
                    >
                      {isDark ? <Moon className="h-3 w-3 text-[#E84545]" /> : <Sun className="h-3 w-3 text-[#E84545]" />}
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: th.mobileHeaderSub }}>{pagination.total} records</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileMenu(true)}
                className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: th.mobileSearchPH }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search logs..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-[#E84545] focus:border-transparent transition-colors duration-500"
                  style={{ background: th.mobileSearchBg, border: `1px solid ${th.mobileSearchBorder}`, color: th.mobileSearchText }}
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.mobileBtnBg, color: th.mobileBtnText }}
              >
                <Filter className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Desktop Header ─────────────────────────────────────────────── */}
        <div
          className="hidden md:block py-12 border-b shadow-xl transition-colors duration-500"
          style={{
            background: `linear-gradient(135deg,${th.headerBgFrom},${th.headerBgVia},${th.headerBgTo})`,
            borderColor: th.headerBorder,
          }}
        >
          <div className="px-8">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold" style={{ color: th.headerTitle }}>Activity Logs</h1>
                  
                </div>
                <p className="mt-1" style={{ color: th.headerSub }}>
                  Track all system activities and user actions
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={downloadCSV}
                  className="group flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all"
                  style={{ background: th.headerBtnBg, border: `1px solid ${th.headerBtnBorder}`, color: th.headerBtnText }}
                  onMouseEnter={e => (e.currentTarget.style.background = th.headerBtnHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = th.headerBtnBg)}
                >
                  <FileDown className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pt-[140px] md:pt-6 pb-6">

          {/* ── Desktop Search + Filters ───────────────────────────────────── */}
          <div className="hidden md:block space-y-4 mb-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-5 w-5 text-[#E84545]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search activity logs..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent transition-colors duration-500"
                  style={inputStyle}
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Search
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
                style={{
                  background: showFilters ? 'rgba(232,69,69,0.15)' : th.filterPanelBg,
                  border: `1px solid ${showFilters ? 'rgba(232,69,69,0.30)' : th.filterPanelBorder}`,
                  color: th.filterInputText,
                }}
              >
                <Filter className="h-5 w-5" />
                <span>Filters</span>
              </button>
            </div>

            {showFilters && (
              <div
                className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 rounded-xl p-4 transition-colors duration-500"
                style={{ background: th.filterPanelBg, border: `1px solid ${th.filterPanelBorder}` }}
              >
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: th.filterLabelText }}>Module</label>
                  <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent capitalize transition-colors duration-500"
                    style={inputStyle}
                  >
                    {modules.map(mod => <option key={mod} value={mod} className="capitalize">{mod}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: th.filterLabelText }}>Action Type</label>
                  <select value={filterActionType} onChange={(e) => setFilterActionType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent capitalize transition-colors duration-500"
                    style={inputStyle}
                  >
                    {actionTypes.map(type => <option key={type} value={type} className="capitalize">{type}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: th.filterLabelText }}>Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent transition-colors duration-500"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: th.filterLabelText }}>End Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#E84545] focus:border-transparent transition-colors duration-500"
                    style={inputStyle}
                  />
                </div>
                <div className="flex items-end md:col-span-4">
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 rounded-lg transition-colors"
                    style={{ background: 'rgba(232,69,69,0.10)', border: '1px solid rgba(232,69,69,0.30)', color: th.filterInputText }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,69,69,0.20)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(232,69,69,0.10)')}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Main Table / Card Container ────────────────────────────────── */}
          <div
            className="rounded-2xl shadow-xl overflow-hidden transition-colors duration-500"
            style={{ background: th.containerBg, border: `1px solid ${th.containerBorder}` }}
          >
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E84545] mx-auto mb-4" />
                <p style={{ color: th.tableCellMuted }}>Loading activity logs...</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="overflow-x-auto hidden md:block">
                  <table className="min-w-full">
                    <thead style={{ background: th.tableHeadBg }}>
                      <tr>
                        {['User', 'Action', 'Module', 'Description', 'Time'].map(h => (
                          <th
                            key={h}
                            className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                            style={{ color: th.tableHeadText }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length > 0 ? logs.map((log) => (
                        <tr
                          key={log._id}
                          className="transition-colors"
                          style={{ borderTop: `1px solid ${th.tableRowDivider}` }}
                          onMouseEnter={e => (e.currentTarget.style.background = th.tableRowHover)}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" style={{ color: th.tableCellMuted }} />
                              <span className="text-sm" style={{ color: th.tableCellPrimary }}>{log.username}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {getActionIcon(log.actionType)}
                              <span className="text-sm capitalize" style={{ color: th.tableCellSecondary }}>{log.actionType}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2" style={{ color: th.tableCellMuted }}>
                              {getModuleIcon(log.module)}
                              <span className="text-sm capitalize" style={{ color: th.tableCellSecondary }}>{log.module}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm max-w-md truncate" style={{ color: th.tableCellSecondary }}>
                            {log.description}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm" style={{ color: th.tableCellMuted }}>
                              <Clock className="h-4 w-4" />
                              <span>{formatTimestamp(log.timestamp)}</span>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <Activity className="h-10 w-10 mx-auto mb-2" style={{ color: th.emptyIcon }} />
                            <p className="text-sm" style={{ color: th.emptyText }}>No activity logs found</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y" style={{ borderColor: th.mobileCardDivider }}>
                  {logs.length > 0 ? logs.map((log) => (
                    <div
                      key={log._id}
                      className="p-4 transition-all active:scale-[0.99] rounded-xl m-2"
                      style={{
                        background: `linear-gradient(135deg,${th.mobileCardBgFrom},${th.mobileCardBgTo})`,
                        border: `1px solid ${th.mobileCardBorder}`,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(232,69,69,0.30)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = th.mobileCardBorder)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.actionType)}
                          <span className="text-sm font-semibold capitalize" style={{ color: th.tableCellPrimary }}>{log.actionType}</span>
                        </div>
                        <span className="text-xs" style={{ color: th.mobileCardLabel }}>{formatTimestamp(log.timestamp)}</span>
                      </div>
                      <p className="text-sm mb-2" style={{ color: th.tableCellSecondary }}>{log.description}</p>
                      <div className="flex items-center gap-3 text-xs" style={{ color: th.mobileCardLabel }}>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{log.username}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          {getModuleIcon(log.module)}
                          <span className="capitalize">{log.module}</span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 text-center">
                      <Activity className="h-10 w-10 mx-auto mb-2" style={{ color: th.emptyIcon }} />
                      <p className="text-sm" style={{ color: th.emptyText }}>No activity logs found</p>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div
                    className="px-4 md:px-6 py-4 flex items-center justify-between transition-colors duration-500"
                    style={{ borderTop: `1px solid ${th.paginationDivider}` }}
                  >
                    <p className="text-sm" style={{ color: th.paginationMuted }}>
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                    </p>
                    <div className="flex gap-2">
                      {[
                        { label: 'Previous', disabled: pagination.page === 1,        action: () => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) })) },
                        { label: 'Next',     disabled: pagination.page === pagination.pages, action: () => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) })) },
                      ].map(btn => (
                        <button
                          key={btn.label}
                          onClick={btn.action}
                          disabled={btn.disabled}
                          className="px-3 py-1 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ background: th.paginationBg, border: `1px solid ${th.paginationBorder}`, color: th.paginationText }}
                          onMouseEnter={e => !btn.disabled && (e.currentTarget.style.background = th.tableRowHover)}
                          onMouseLeave={e => (e.currentTarget.style.background = th.paginationBg)}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile Filter Modal ──────────────────────────────────────────── */}
      {showFilters && isMobile && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200">
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl max-h-[80vh] overflow-y-auto"
            style={{ background: th.modalBg, borderColor: th.modalBorder }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: th.modalTitle }}>Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.modalCloseBg, color: th.modalCloseText }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Module',      value: filterModule,     onChange: setFilterModule,     opts: modules.map(m => [m, m]) },
                { label: 'Action Type', value: filterActionType, onChange: setFilterActionType, opts: actionTypes.map(t => [t, t]) },
              ].map(s => (
                <div key={s.label}>
                  <label className="block text-sm font-medium mb-2" style={{ color: th.modalItemText }}>{s.label}</label>
                  <select
                    value={s.value} onChange={e => s.onChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg capitalize"
                    style={mobileInputStyle}
                  >
                    {s.opts.map(([v, l]) => <option key={v} value={v} className="capitalize">{l}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: th.modalItemText }}>Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg" style={mobileInputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: th.modalItemText }}>End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg" style={mobileInputStyle} />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { clearFilters(); setShowFilters(false); }}
                  className="flex-1 px-4 py-3 rounded-xl transition-colors active:scale-95"
                  style={{ background: th.modalItemBg, border: `1px solid ${th.modalItemBorder}`, color: th.modalItemText }}
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-xl text-white font-semibold active:scale-95 transition-all"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Action Menu ───────────────────────────────────────────── */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200">
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl"
            style={{ background: th.modalBg, borderColor: th.modalBorder }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: th.modalTitle }}>Actions</h2>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 rounded-xl active:scale-95 transition-all"
                style={{ background: th.modalCloseBg, color: th.modalCloseText }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Export to CSV', icon: <FileDown className="h-5 w-5" />, action: () => { downloadCSV(); setShowMobileMenu(false); } },
                { label: 'Filters',       icon: <Filter  className="h-5 w-5" />, action: () => { setShowFilters(true); setShowMobileMenu(false); } },
              ].map(btn => (
                <button
                  key={btn.label}
                  onClick={btn.action}
                  className="w-full p-4 rounded-2xl font-semibold transition-all flex items-center justify-between active:scale-95"
                  style={{ background: th.modalItemBg, border: `1px solid ${th.modalItemBorder}`, color: th.modalItemText }}
                >
                  <span>{btn.label}</span>{btn.icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}