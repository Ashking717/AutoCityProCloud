'use client';
import { useEffect, useState, useRef, useCallback, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  DollarSign,
  Activity,
  Package,
  Users,
  ShoppingCart,
  CreditCard,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Sparkles,
  Clock,
  ChevronRight,
  BarChart3,
  MoreVertical,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Menu,
  Search,
  Filter,
  X,
  FileDown,
  Bell,
  Zap,
  Sun,
  Moon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  formatTime,
  formatDate,
  formatDateTime,
  getRelativeTime,
  getCurrentDateInTimezone,
  getTimezoneOffset,
  QATAR_TIMEZONE,
} from '@/lib/utils/timezone';

// ✅ OPTIMIZATION: Lazy load Chart components (below the fold)
const SalesTrendChart = lazy(() => import('@/components/charts/SalesTrendChart'));
const TopProductsChart = lazy(() => import('@/components/charts/TopProductsChart'));

// Types
interface DashboardStats {
  todaySales: number;
  monthSales: number;
  totalProfit: number;
  profitMargin: number;
  lowStockItems: number;
  totalCustomers: number;
  totalOrders: number;
  averageOrderValue: number;
  pendingPayments: number;
  pendingCount: number;
}
interface PercentageChanges {
  salesChange: number;
  profitChange: number;
  customerChange: number;
  lowStockChange: number;
  todayVsYesterday: { sales: number; profit: number };
}
interface SalesTrend {
  labels: string[];
  data: number[];
  profits: number[];
}
interface TopProduct {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}
interface RecentActivity {
  id: string;
  description: string;
  user: string;
  timestamp: string;
  type: string;
}
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatar?: string;
}
type PeriodType = 'today' | 'week' | 'month' | 'year';
interface DashboardData {
  stats: DashboardStats;
  salesTrend: SalesTrend;
  topProducts: TopProduct[];
  recentActivity: RecentActivity[];
  percentageChanges: PercentageChanges;
  period: string;
}

const defaultStats: DashboardStats = {
  todaySales: 0, monthSales: 0, totalProfit: 0, profitMargin: 0,
  lowStockItems: 0, totalCustomers: 0, totalOrders: 0,
  averageOrderValue: 0, pendingPayments: 0, pendingCount: 0,
};
const defaultPercentageChanges: PercentageChanges = {
  salesChange: 0, profitChange: 0, customerChange: 0, lowStockChange: 0,
  todayVsYesterday: { sales: 0, profit: 0 },
};
const defaultSalesTrend: SalesTrend = { labels: [], data: [], profits: [] };

// ─── Time-based theme hook ────────────────────────────────────────────────────
// Dark: 6 PM (18:00) → 6 AM (06:00)  |  Light: 6 AM → 6 PM  — matches Sidebar & HomePage
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

// ✅ OPTIMIZATION: Skeleton component — theme-aware
const StatCardSkeleton = ({ isDark }: { isDark: boolean }) => (
  <div
    className="rounded-2xl shadow-lg p-4 animate-pulse"
    style={{
      background: isDark
        ? 'linear-gradient(135deg, #0A0A0A, #050505)'
        : 'linear-gradient(135deg, #ffffff, #f9fafb)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
    }}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="p-2.5 rounded-xl h-9 w-9"
        style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
      />
    </div>
    <div className="h-3 rounded w-20 mb-1.5"
      style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
    />
    <div className="h-8 rounded w-24 mb-2"
      style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
    />
    <div className="flex items-center justify-between pt-2"
      style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}
    >
      <div className="h-4 rounded w-12"
        style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
      />
      <div className="h-3 rounded w-16"
        style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
      />
    </div>
  </div>
);

export default function DashboardPage() {
  const router = useRouter();
  const isDark = useTimeBasedTheme();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState<PeriodType>('month');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(getCurrentDateInTimezone());
  const hasFetched = useRef(false);

  const stats = dashboardData?.stats || defaultStats;
  const percentageChanges = dashboardData?.percentageChanges || defaultPercentageChanges;
  const salesTrend = dashboardData?.salesTrend || defaultSalesTrend;
  const topProducts = dashboardData?.topProducts || [];
  const recentActivity = dashboardData?.recentActivity || [];

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    pageBg:          isDark ? '#050505'                              : '#f3f4f6',
    // Page/section header
    headerBgFrom:    isDark ? '#932222'                              : '#fef2f2',
    headerBgVia:     isDark ? '#411010'                              : '#fee2e2',
    headerBgTo:      isDark ? '#a20c0c'                              : '#fecaca',
    headerBorder:    isDark ? 'rgba(255,255,255,0.05)'               : 'rgba(0,0,0,0.06)',
    headerTitle:     isDark ? '#ffffff'                              : '#7f1d1d',
    headerSubText:   isDark ? 'rgba(255,255,255,0.9)'                : '#991b1b',
    headerAccent:    '#E84545',
    // Period toggle bar
    toggleBarBg:     isDark ? 'rgba(10,10,10,0.50)'                  : 'rgba(255,255,255,0.80)',
    toggleBarBorder: isDark ? 'rgba(255,255,255,0.05)'               : 'rgba(0,0,0,0.08)',
    toggleInactiveText: isDark ? '#9ca3af'                           : '#6b7280',
    toggleInactiveHover: isDark ? 'rgba(255,255,255,0.05)'           : 'rgba(0,0,0,0.04)',
    // Icon button (refresh etc.)
    iconBtnBg:       isDark ? 'rgba(10,10,10,0.50)'                  : 'rgba(255,255,255,0.80)',
    iconBtnBorder:   isDark ? 'rgba(255,255,255,0.05)'               : 'rgba(0,0,0,0.08)',
    iconBtnHoverBorder: 'rgba(232,69,69,0.30)',
    iconBtnIcon:     isDark ? '#9ca3af'                              : '#6b7280',
    // Stat cards
    cardBgFrom:      isDark ? '#0A0A0A'                              : '#ffffff',
    cardBgTo:        isDark ? '#050505'                              : '#f9fafb',
    cardBorder:      isDark ? 'rgba(255,255,255,0.10)'               : 'rgba(0,0,0,0.08)',
    cardHoverBorder: 'rgba(232,69,69,0.30)',
    cardHoverShadow: 'rgba(232,69,69,0.05)',
    cardTitle:       isDark ? '#9ca3af'                              : '#6b7280',
    cardValue:       isDark ? '#ffffff'                              : '#111827',
    cardDivider:     isDark ? 'rgba(255,255,255,0.05)'               : 'rgba(0,0,0,0.06)',
    cardDesc:        isDark ? '#6b7280'                              : '#9ca3af',
    // Performance section
    perfSectionBg:   isDark ? 'rgba(10,10,10,0.50)'                  : 'rgba(255,255,255,0.70)',
    perfSectionBorder: isDark ? 'rgba(255,255,255,0.05)'             : 'rgba(0,0,0,0.06)',
    perfLabel:       isDark ? '#d1d5db'                              : '#374151',
    // Charts placeholder
    chartPlaceholderBg: isDark ? 'rgba(10,10,10,0.50)'               : 'rgba(255,255,255,0.70)',
    chartPlaceholderShimmer: isDark ? 'rgba(255,255,255,0.05)'       : 'rgba(0,0,0,0.05)',
    // Activity / quick actions
    panelBgFrom:     isDark ? '#0A0A0A'                              : '#ffffff',
    panelBgTo:       isDark ? '#050505'                              : '#f9fafb',
    panelBorder:     isDark ? 'rgba(255,255,255,0.10)'               : 'rgba(0,0,0,0.08)',
    activityRowBg:   isDark ? 'rgba(10,10,10,0.50)'                  : 'rgba(0,0,0,0.03)',
    activityRowHover: isDark ? '#0A0A0A'                             : 'rgba(0,0,0,0.06)',
    activityRowBorder: isDark ? 'rgba(255,255,255,0.05)'             : 'rgba(0,0,0,0.06)',
    activityRowHoverBorder: 'rgba(232,69,69,0.20)',
    activityText:    isDark ? '#e5e7eb'                              : '#111827',
    activityMeta:    isDark ? '#6b7280'                              : '#9ca3af',
    panelTitle:      isDark ? '#ffffff'                              : '#111827',
    // Quick action secondary buttons
    qaSecBg:         isDark ? 'rgba(10,10,10,0.50)'                  : 'rgba(0,0,0,0.03)',
    qaSecBorder:     isDark ? 'rgba(255,255,255,0.05)'               : 'rgba(0,0,0,0.06)',
    qaSecText:       isDark ? '#d1d5db'                              : '#374151',
    qaSecHoverBg:    isDark ? 'rgba(255,255,255,0.05)'               : 'rgba(0,0,0,0.06)',
    // Summary rows
    summaryRowBg:    isDark ? 'rgba(10,10,10,0.50)'                  : 'rgba(0,0,0,0.03)',
    summaryLabel:    isDark ? '#9ca3af'                              : '#6b7280',
    summaryValue:    isDark ? '#ffffff'                              : '#111827',
    summaryDivider:  isDark ? 'rgba(255,255,255,0.05)'               : 'rgba(0,0,0,0.06)',
    summarySubLabel: isDark ? '#9ca3af'                              : '#6b7280',
    // Mobile header
    mobileHeaderBg:  isDark
      ? 'linear-gradient(135deg, #0A0A0A, #050505, #0A0A0A)'
      : 'linear-gradient(135deg, #ffffff, #f9fafb, #ffffff)',
    mobileHeaderBorder: isDark ? 'rgba(255,255,255,0.05)'            : 'rgba(0,0,0,0.08)',
    mobileHeaderTitle: isDark ? '#ffffff'                            : '#111827',
    mobileHeaderSub:   isDark ? 'rgba(255,255,255,0.60)'             : '#6b7280',
    mobileHeaderBtnBg: isDark ? 'rgba(255,255,255,0.05)'             : 'rgba(0,0,0,0.05)',
    mobileHeaderBtnText: isDark ? 'rgba(255,255,255,0.80)'           : '#374151',
    periodBtnBg:     isDark ? 'rgba(232,69,69,0.10)'                 : 'rgba(232,69,69,0.08)',
    periodBtnBorder: isDark ? 'rgba(232,69,69,0.20)'                 : 'rgba(232,69,69,0.25)',
    timeText:        isDark ? 'rgba(255,255,255,0.40)'                : '#9ca3af',
    // Mobile filter / menu modal
    modalBg:         isDark
      ? 'linear-gradient(180deg, #0A0A0A 0%, #050505 100%)'
      : 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)',
    modalBorder:     isDark ? 'rgba(255,255,255,0.10)'               : 'rgba(0,0,0,0.08)',
    modalTitle:      isDark ? '#ffffff'                              : '#111827',
    modalCloseBg:    isDark ? 'rgba(255,255,255,0.05)'               : 'rgba(0,0,0,0.05)',
    modalCloseText:  isDark ? '#9ca3af'                              : '#6b7280',
    periodCardInactiveBg: isDark ? 'rgba(255,255,255,0.05)'          : 'rgba(0,0,0,0.04)',
    periodCardInactiveBorder: isDark ? 'rgba(255,255,255,0.05)'      : 'rgba(0,0,0,0.06)',
    periodCardInactiveText: isDark ? '#d1d5db'                       : '#374151',
    // Dynamic island
    islandBg:        isDark ? '#000000'                              : '#ffffff',
    islandBorder:    isDark ? 'rgba(255,255,255,0.10)'               : 'rgba(0,0,0,0.10)',
    islandText:      isDark ? '#ffffff'                              : '#111827',
    islandDivider:   isDark ? 'rgba(255,255,255,0.20)'               : 'rgba(0,0,0,0.12)',
    // Error screen
    errorBg:         isDark ? '#0A0A0A'                              : '#ffffff',
    errorBorder:     isDark ? 'rgba(255,255,255,0.05)'               : 'rgba(0,0,0,0.08)',
    errorText:       isDark ? '#ffffff'                              : '#111827',
    errorSubText:    isDark ? '#9ca3af'                              : '#6b7280',
    // Scrollbar (injected via style tag)
    scrollTrack:     isDark ? '#0A0A0A'                              : '#f1f5f9',
    scrollThumb:     isDark ? '#E84545'                              : 'rgba(232,69,69,0.6)',
  };

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentDateInTimezone());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkIfMobile = () => setIsMobile(window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // ✅ OPTIMIZATION: Parallel API calls
  const fetchDashboardData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) { setLoading(true); setError(null); }
      else setRefreshing(true);

      const [userRes, analyticsRes] = await Promise.all([
        fetch('/api/auth/me', { credentials: 'include', headers: { 'Cache-Control': 'no-cache' } }),
        fetch(`/api/analytics/dashboard?period=${period}`, { credentials: 'include', headers: { 'Cache-Control': 'no-cache' } }),
      ]);

      if (!userRes.ok) throw new Error('Unauthorized');
      if (!analyticsRes.ok) throw new Error(`Failed to fetch analytics: ${analyticsRes.status}`);

      const [userData, data] = await Promise.all([userRes.json(), analyticsRes.json()]);

      setUser(userData.user);
      setDashboardData(data);
      setLastUpdated(getCurrentDateInTimezone());
      if (showLoading) setLoading(false);
      else setRefreshing(false);
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      setError(error.message || 'Failed to load dashboard data');
      if (showLoading) setLoading(false);
      else setRefreshing(false);
      if (error.message === 'Unauthorized') window.location.href = '/autocityPro/login';
    }
  }, [period]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  useEffect(() => { fetchDashboardData(); }, [period]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    window.location.href = '/autocityPro/login';
  };
  const handleRefresh = () => fetchDashboardData(false);
  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
    setDashboardData(null);
    if (isMobile) setShowMobileFilter(false);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-QA', { style: 'currency', currency: 'QAR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1_000_000) return `QR${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 10_000)    return `QR${(amount / 1_000).toFixed(1)}K`;
    return formatCurrency(amount);
  };

  const formatPercentage = (value: number) => {
    if (value === 0) return '0%';
    return `${value > 0 ? '+' : '-'}${Math.abs(value).toFixed(1)}%`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order':     return <ShoppingCart className="h-4 w-4 text-[#E84545]" />;
      case 'inventory': return <Package      className="h-4 w-4 text-blue-400" />;
      case 'payment':   return <CreditCard   className="h-4 w-4 text-green-400" />;
      case 'customer':  return <Users        className="h-4 w-4 text-yellow-400" />;
      default:          return <Activity     className="h-4 w-4 text-gray-400" />;
    }
  };

  const periodOptions: { value: PeriodType; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week',  label: 'Week'  },
    { value: 'month', label: 'Month' },
    { value: 'year',  label: 'Year'  },
  ];

  // ── Shared sub-components ─────────────────────────────────────────────────

  const DynamicIsland = () => (
    <div className="fixed top-2 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div
        className="rounded-[28px] px-6 py-3 shadow-2xl backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500"
        style={{
          background: th.islandBg,
          border: `1px solid ${th.islandBorder}`,
          color: th.islandText,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium" style={{ color: th.islandText }}>Live</span>
          </div>
          <div className="h-3 w-px" style={{ background: th.islandDivider }} />
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-[#E84545]" />
            <span className="text-xs font-semibold" style={{ color: th.islandText }}>{formatCompactCurrency(stats.todaySales)}</span>
          </div>
          {stats.lowStockItems > 0 && (
            <>
              <div className="h-3 w-px" style={{ background: th.islandDivider }} />
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-orange-500" />
                <span className="text-xs font-medium text-orange-400">{stats.lowStockItems}</span>
              </div>
            </>
          )}
          {/* Theme indicator */}
          <div className="h-3 w-px" style={{ background: th.islandDivider }} />
          {isDark
            ? <Moon className="h-3 w-3 text-[#E84545]" />
            : <Sun  className="h-3 w-3 text-[#E84545]" />}
        </div>
      </div>
    </div>
  );

  const MobileHeader = ({ isLoading = false }: { isLoading?: boolean }) => (
    <div
      className="md:hidden fixed top-0 left-0 right-0 z-40 backdrop-blur-xl pt-safe"
      style={{
        background: th.mobileHeaderBg,
        borderBottom: `1px solid ${th.mobileHeaderBorder}`,
      }}
    >
      <div className="px-4 py-3 mt-12">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl active:scale-95 transition-all"
              style={{ background: th.mobileHeaderBtnBg, color: th.mobileHeaderBtnText }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold" style={{ color: th.mobileHeaderTitle }}>Dashboard</h1>
              <p className="text-xs" style={{ color: th.mobileHeaderSub }}>
                {isLoading ? 'Loading...' : `Hi, ${user?.firstName}!`}
              </p>
            </div>
          </div>
          {!isLoading && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMobileFilter(true)}
                className="px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-1.5 active:scale-95 transition-all"
                style={{
                  background: th.periodBtnBg,
                  border: `1px solid ${th.periodBtnBorder}`,
                  color: '#E84545',
                }}
              >
                <span>{period.charAt(0).toUpperCase() + period.slice(1)}</span>
                <ChevronRightIcon className="h-3 w-3" />
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-lg active:scale-95 transition-all disabled:opacity-50"
                style={{ background: th.mobileHeaderBtnBg, color: th.mobileHeaderBtnText }}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowMobileMenu(true)}
                className="p-2 rounded-lg active:scale-95 transition-all"
                style={{ background: th.mobileHeaderBtnBg, color: th.mobileHeaderBtnText }}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        {lastUpdated && !isLoading && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: th.timeText }}>
            <Clock className="h-3 w-3" />
            <span>Updated {formatTime(lastUpdated)} ({getTimezoneOffset()})</span>
          </div>
        )}
      </div>
    </div>
  );

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading && !dashboardData) {
    return (
      <MainLayout user={user} onLogout={handleLogout}>
        <div className="min-h-screen transition-colors duration-500" style={{ background: th.pageBg }}>
          {isMobile && showDynamicIsland && <DynamicIsland />}
          <MobileHeader isLoading />

          {/* Desktop Header */}
          <div
            className="hidden md:block py-11 border-b shadow-xl transition-colors duration-500"
            style={{
              background: `linear-gradient(135deg, ${th.headerBgFrom}, ${th.headerBgVia}, ${th.headerBgTo})`,
              borderColor: th.headerBorder,
            }}
          >
            <div className="px-8">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3"
                style={{ color: th.headerTitle }}
              >
                <Sparkles className="h-8 w-8 text-[#E84545]" />
                Dashboard
              </h1>
              <p className="mt-2" style={{ color: th.headerSubText }}>Loading your data...</p>
            </div>
          </div>

          <div className="px-4 md:px-6 pt-[140px] md:pt-6 pb-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
              {[1, 2, 3, 4, 5].map((i) => <StatCardSkeleton key={i} isDark={isDark} />)}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // ── Error screen ─────────────────────────────────────────────────────────
  if (error && !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-500"
        style={{ background: th.pageBg }}
      >
        <div
          className="text-center max-w-md w-full p-8 rounded-2xl shadow-2xl"
          style={{ background: th.errorBg, border: `1px solid ${th.errorBorder}` }}
        >
          <AlertCircle className="h-16 w-16 text-[#E84545] mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2" style={{ color: th.errorText }}>Unable to Load Dashboard</h2>
          <p className="mb-6" style={{ color: th.errorSubText }}>{error}</p>
          <button
            onClick={() => fetchDashboardData()}
            className="px-6 py-3 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200 shadow-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Today's Sales", mobileTitle: 'Today',
      value: formatCompactCurrency(stats.todaySales),
      icon: DollarSign,
      gradient: 'from-[#E84545] to-[#cc3c3c]',
      change: formatPercentage(percentageChanges.todayVsYesterday.sales),
      changePositive: percentageChanges.todayVsYesterday.sales >= 0,
      description: 'vs yesterday', alert: false,
    },
    {
      title: `${period.charAt(0).toUpperCase() + period.slice(1)} Revenue`, mobileTitle: 'Revenue',
      value: formatCompactCurrency(stats.monthSales),
      icon: TrendingUp,
      gradient: 'from-[#E84545] to-[#cc3c3c]',
      change: formatPercentage(percentageChanges.salesChange),
      changePositive: percentageChanges.salesChange >= 0,
      description: `vs last ${period}`, alert: false,
    },
    {
      title: 'Total Profit', mobileTitle: 'Profit',
      value: formatCompactCurrency(stats.totalProfit),
      icon: Activity,
      gradient: 'from-green-500 to-emerald-600',
      change: `${stats.profitMargin.toFixed(1)}%`,
      changePositive: stats.profitMargin >= 20,
      description: 'profit margin', alert: false,
    },
    {
      title: 'Low Stock Items', mobileTitle: 'Stock',
      value: stats.lowStockItems,
      icon: AlertCircle,
      gradient: stats.lowStockItems > 0 ? 'from-orange-500 to-red-600' : 'from-green-500 to-emerald-600',
      change: stats.lowStockItems > 0 ? 'Alert' : 'Good',
      changePositive: stats.lowStockItems === 0,
      description: 'items low',
      alert: stats.lowStockItems > 0,
    },
    {
      title: 'Total Customers', mobileTitle: 'Customers',
      value: stats.totalCustomers.toLocaleString(),
      icon: Users,
      gradient: 'from-blue-500 to-cyan-600',
      change: formatPercentage(percentageChanges.customerChange),
      changePositive: percentageChanges.customerChange >= 0,
      description: 'active users', alert: false,
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div
        className="min-h-screen transition-colors duration-500"
        style={{ background: th.pageBg }}
      >
        {/* Dynamic Island */}
        {isMobile && showDynamicIsland && <DynamicIsland />}

        {/* Mobile Header */}
        <MobileHeader />

        {/* Mobile Filter Modal */}
        {showMobileFilter && (
          <div className="md:hidden mb-20 fixed top-0 left-0 right-0 bottom-0 bg-black/80 backdrop-blur-md z-[60] animate-in fade-in duration-200">
            <div
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl"
              style={{ background: th.modalBg, borderColor: th.modalBorder }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold" style={{ color: th.modalTitle }}>Select Period</h2>
                <button
                  onClick={() => setShowMobileFilter(false)}
                  className="p-2 rounded-xl active:scale-95 transition-all"
                  style={{ background: th.modalCloseBg, color: th.modalCloseText }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {periodOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handlePeriodChange(option.value)}
                    className="p-4 rounded-2xl text-left transition-all active:scale-95"
                    style={period === option.value
                      ? { background: 'linear-gradient(135deg, #E84545, #cc3c3c)', color: '#ffffff', boxShadow: '0 8px 24px rgba(232,69,69,0.20)' }
                      : { background: th.periodCardInactiveBg, color: th.periodCardInactiveText, border: `1px solid ${th.periodCardInactiveBorder}` }
                    }
                  >
                    <span className="font-semibold text-lg">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Desktop Header */}
        <div
          className="hidden md:block py-11 border-b shadow-xl transition-colors duration-500"
          style={{
            background: `linear-gradient(135deg, ${th.headerBgFrom}, ${th.headerBgVia}, ${th.headerBgTo})`,
            borderColor: th.headerBorder,
          }}
        >
          <div className="px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1
                  className="text-3xl font-bold tracking-tight flex items-center gap-3"
                  style={{ color: th.headerTitle }}
                >
                  <Sparkles className="h-8 w-8 text-[#E84545]" />
                  Dashboard
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <p style={{ color: th.headerSubText }}>
                    Welcome back,{' '}
                    <span className="font-semibold" style={{ color: th.headerAccent }}>{user?.firstName}!</span>
                  </p>
                  {lastUpdated && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.60)' : '#991b1b' }}>
                      <Clock className="h-3 w-3" />
                      {formatDateTime(lastUpdated)} ({getTimezoneOffset()})
                    </span>
                  )}
                  
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Period toggle */}
                <div
                  className="flex items-center gap-1 rounded-xl p-1 backdrop-blur-sm"
                  style={{
                    background: th.toggleBarBg,
                    border: `1px solid ${th.toggleBarBorder}`,
                  }}
                >
                  {periodOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handlePeriodChange(option.value)}
                      className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                      style={period === option.value
                        ? { background: 'linear-gradient(135deg, #E84545, #cc3c3c)', color: '#ffffff', boxShadow: '0 4px 12px rgba(232,69,69,0.20)' }
                        : { color: th.toggleInactiveText }
                      }
                      onMouseEnter={e => {
                        if (period !== option.value)
                          (e.currentTarget as HTMLButtonElement).style.background = th.toggleInactiveHover;
                      }}
                      onMouseLeave={e => {
                        if (period !== option.value)
                          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Refresh */}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-3 rounded-xl backdrop-blur-sm shadow-lg transition-all disabled:opacity-50"
                  style={{
                    background: th.iconBtnBg,
                    border: `1px solid ${th.iconBtnBorder}`,
                    color: th.iconBtnIcon,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = th.iconBtnHoverBorder)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = th.iconBtnBorder)}
                >
                  <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content ────────────────────────────────────────────────── */}
        <div className="px-4 md:px-6 pt-[160px] md:pt-6 pb-6">

          {/* Stat Cards */}
          <div className="mb-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              {statCards.map((stat, index) => (
                <div
                  key={index}
                  className="rounded-2xl shadow-lg p-4 transition-all duration-300 active:scale-[0.98] group cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, ${th.cardBgFrom}, ${th.cardBgTo})`,
                    border: `1px solid ${th.cardBorder}`,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = th.cardHoverBorder;
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${th.cardHoverShadow}`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = th.cardBorder;
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`bg-gradient-to-r ${stat.gradient} p-2.5 rounded-xl shadow-lg`}>
                      <stat.icon className="h-4 w-4 text-white" />
                    </div>
                    {stat.alert && (
                      <div className="animate-pulse h-2 w-2 rounded-full bg-[#E84545] shadow-lg shadow-[#E84545]/50" />
                    )}
                  </div>
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 md:hidden"
                    style={{ color: th.cardTitle }}
                  >
                    {stat.mobileTitle}
                  </h3>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 hidden md:block"
                    style={{ color: th.cardTitle }}
                  >
                    {stat.title}
                  </h3>
                  <p className="text-xl md:text-2xl font-bold mb-2 truncate" style={{ color: th.cardValue }}>
                    {stat.value}
                  </p>
                  <div
                    className="flex items-center justify-between pt-2"
                    style={{ borderTop: `1px solid ${th.cardDivider}` }}
                  >
                    <span className={`text-[10px] md:text-xs font-semibold px-2 py-0.5 rounded-full ${
                      stat.changePositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {stat.change}
                    </span>
                    <p className="text-[10px] md:text-xs truncate ml-1" style={{ color: th.cardDesc }}>
                      {stat.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Summary */}
          <div
            className="mb-6 p-4 md:p-6 rounded-2xl backdrop-blur-sm shadow-lg transition-colors duration-500"
            style={{
              background: `linear-gradient(135deg, ${th.cardBgFrom}, ${th.cardBgTo})`,
              border: `1px solid ${th.panelBorder}`,
            }}
          >
            <h2 className="text-base md:text-lg font-bold mb-4 flex items-center"
              style={{ color: th.panelTitle }}
            >
              <Activity className="h-4 w-4 md:h-5 md:w-5 mr-2 text-[#E84545]" />
              Performance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              {[
                {
                  label: 'Sales Growth',
                  value: formatPercentage(percentageChanges.salesChange),
                  valueColor: percentageChanges.salesChange >= 0 ? '#4ade80' : '#f87171',
                  barColor: percentageChanges.salesChange >= 0
                    ? 'linear-gradient(90deg,#22c55e,#10b981)'
                    : 'linear-gradient(90deg,#ef4444,#f43f5e)',
                  barWidth: Math.min(Math.abs(percentageChanges.salesChange), 100),
                },
                {
                  label: 'Profit Margin',
                  value: `${stats.profitMargin.toFixed(1)}%`,
                  valueColor: stats.profitMargin > 20 ? '#4ade80' : stats.profitMargin > 10 ? '#facc15' : '#f87171',
                  barColor: stats.profitMargin > 20
                    ? 'linear-gradient(90deg,#22c55e,#10b981)'
                    : stats.profitMargin > 10
                      ? 'linear-gradient(90deg,#eab308,#f59e0b)'
                      : 'linear-gradient(90deg,#ef4444,#f43f5e)',
                  barWidth: Math.min(stats.profitMargin, 100),
                },
                {
                  label: 'Avg Order',
                  value: formatCompactCurrency(stats.averageOrderValue),
                  valueColor: '#E84545',
                  barColor: 'linear-gradient(90deg,#E84545,#cc3c3c)',
                  barWidth: Math.min(stats.averageOrderValue / 5000 * 100, 100),
                },
              ].map((row, i) => (
                <div
                  key={i}
                  className="p-3 md:p-4 rounded-xl"
                  style={{ background: th.perfSectionBg, border: `1px solid ${th.perfSectionBorder}` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs md:text-sm font-medium" style={{ color: th.perfLabel }}>{row.label}</span>
                    <span className="text-xs md:text-sm font-bold" style={{ color: row.valueColor }}>{row.value}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden"
                    style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ background: row.barColor, width: `${row.barWidth}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
            {(['SalesTrendChart', 'TopProductsChart'] as const).map((name, i) => (
              <Suspense
                key={i}
                fallback={
                  <div
                    className="rounded-2xl shadow-lg p-4 md:p-6"
                    style={{
                      background: `linear-gradient(135deg, ${th.cardBgFrom}, ${th.cardBgTo})`,
                      border: `1px solid ${th.panelBorder}`,
                    }}
                  >
                    <div className="animate-pulse">
                      <div className="h-6 rounded w-32 mb-4" style={{ background: th.chartPlaceholderShimmer }} />
                      <div className="h-48 md:h-64 rounded-xl" style={{ background: th.chartPlaceholderShimmer }} />
                    </div>
                  </div>
                }
              >
                {i === 0
                  ? <SalesTrendChart data={salesTrend} period={period} isMobile={isMobile} formatCurrency={formatCurrency} />
                  : <TopProductsChart products={topProducts} isMobile={isMobile} formatCurrency={formatCompactCurrency} />
                }
              </Suspense>
            ))}
          </div>

          {/* Recent Activity + Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Recent Activity */}
            <div
              className="lg:col-span-2 rounded-2xl shadow-lg p-4 md:p-6 transition-colors duration-500"
              style={{
                background: `linear-gradient(135deg, ${th.panelBgFrom}, ${th.panelBgTo})`,
                border: `1px solid ${th.panelBorder}`,
              }}
            >
              <h2 className="text-sm md:text-lg font-bold mb-4 flex items-center" style={{ color: th.panelTitle }}>
                <Activity className="h-4 w-4 md:h-5 md:w-5 mr-2 text-[#E84545]" />
                Recent Activity
              </h2>
              <div className="space-y-2 md:space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.slice(0, isMobile ? 3 : 5).map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-xl transition-all active:scale-[0.98]"
                      style={{
                        background: th.activityRowBg,
                        border: `1px solid ${th.activityRowBorder}`,
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLDivElement).style.background = th.activityRowHover;
                        (e.currentTarget as HTMLDivElement).style.borderColor = th.activityRowHoverBorder;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.background = th.activityRowBg;
                        (e.currentTarget as HTMLDivElement).style.borderColor = th.activityRowBorder;
                      }}
                    >
                      <div className="pt-1 flex-shrink-0">{getActivityIcon(activity.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm font-medium line-clamp-2" style={{ color: th.activityText }}>
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] md:text-xs" style={{ color: th.activityMeta }}>
                          <span>{activity.user}</span>
                          <span>•</span>
                          <span>{getRelativeTime(activity.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-10 w-10 mx-auto mb-3" style={{ color: isDark ? '#4b5563' : '#d1d5db' }} />
                    <p className="font-medium text-sm" style={{ color: th.activityMeta }}>No recent activity</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div
              className="rounded-2xl shadow-lg p-4 md:p-6 transition-colors duration-500"
              style={{
                background: `linear-gradient(135deg, ${th.panelBgFrom}, ${th.panelBgTo})`,
                border: `1px solid ${th.panelBorder}`,
              }}
            >
              <h2 className="text-sm md:text-lg font-bold mb-4" style={{ color: th.panelTitle }}>Quick Actions</h2>
              <div className="space-y-2 md:space-y-3">
                <button
                  onClick={() => router.push('/autocityPro/sales/new')}
                  className="w-full p-3 md:p-4 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-xl text-white font-semibold hover:from-[#d63d3d] hover:to-[#b53535] transition-all flex items-center justify-between shadow-lg active:scale-[0.98]"
                >
                  <span className="text-sm">New Sale</span>
                  <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
                </button>
                {[
                  { label: 'Inventory', icon: Package,  href: '/autocityPro/stock'     },
                  { label: 'Customers', icon: Users,    href: '/autocityPro/customers' },
                  { label: 'Reports',   icon: BarChart3, href: '/autocityPro/reports'  },
                ].map((qa) => (
                  <button
                    key={qa.href}
                    onClick={() => router.push(qa.href)}
                    className="w-full p-3 rounded-xl font-semibold transition-all flex items-center justify-between active:scale-[0.98]"
                    style={{
                      background: th.qaSecBg,
                      border: `1px solid ${th.qaSecBorder}`,
                      color: th.qaSecText,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = th.qaSecHoverBg;
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,69,69,0.20)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = th.qaSecBg;
                      (e.currentTarget as HTMLButtonElement).style.borderColor = th.qaSecBorder;
                    }}
                  >
                    <span className="text-sm">{qa.label}</span>
                    <qa.icon className="h-4 w-4" />
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-4" style={{ borderTop: `1px solid ${th.summaryDivider}` }}>
                <h3 className="text-xs font-semibold mb-3" style={{ color: th.summarySubLabel }}>Summary</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Orders', value: stats.totalOrders, valueColor: th.summaryValue },
                    {
                      label: 'Margin',
                      value: `${stats.profitMargin.toFixed(1)}%`,
                      valueColor: stats.profitMargin > 20 ? '#4ade80' : '#facc15',
                    },
                  ].map((row, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg"
                      style={{ background: th.summaryRowBg }}
                    >
                      <span className="text-xs" style={{ color: th.summaryLabel }}>{row.label}</span>
                      <span className="text-xs font-bold" style={{ color: row.valueColor }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Action Menu */}
        {showMobileMenu && (
          <div className="md:hidden mb-20 fixed inset-0 bg-black/80 backdrop-blur-md z-[60] animate-in fade-in duration-200">
            <div
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl"
              style={{ background: th.modalBg, borderColor: th.modalBorder }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold" style={{ color: th.modalTitle }}>Menu</h2>
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
                  { label: 'Export CSV', icon: FileDown,  action: () => { toast.success('Exporting data...'); setShowMobileMenu(false); } },
                  { label: 'Filters',   icon: Filter,     action: () => { setShowFilters(true); setShowMobileMenu(false); } },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={item.action}
                    className="w-full p-4 rounded-2xl font-semibold transition-all flex items-center justify-between active:scale-[0.98]"
                    style={{
                      background: th.qaSecBg,
                      border: `1px solid ${th.qaSecBorder}`,
                      color: th.qaSecText,
                    }}
                  >
                    <span>{item.label}</span>
                    <item.icon className="h-5 w-5" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Safe Area */}
      <div className="md:hidden h-24" />

      <style jsx global>{`
        @supports (padding: max(0px)) {
          .pt-safe { padding-top: max(12px, env(safe-area-inset-top)); }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        ::-webkit-scrollbar       { width: 8px; }
        ::-webkit-scrollbar-track { background: ${th.scrollTrack}; }
        ::-webkit-scrollbar-thumb { background: ${th.scrollThumb}; border-radius: 4px; }
        @keyframes slideInFromTop {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
      `}</style>
    </MainLayout>
  );
}