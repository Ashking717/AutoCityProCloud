'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import dynamic from 'next/dynamic';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

const Line = dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Line })), { ssr: false });
const Bar = dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Bar })), { ssr: false });
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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
  todayVsYesterday: {
    sales: number;
    profit: number;
  };
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
  todaySales: 0,
  monthSales: 0,
  totalProfit: 0,
  profitMargin: 0,
  lowStockItems: 0,
  totalCustomers: 0,
  totalOrders: 0,
  averageOrderValue: 0,
  pendingPayments: 0,
  pendingCount: 0,
};
const defaultPercentageChanges: PercentageChanges = {
  salesChange: 0,
  profitChange: 0,
  customerChange: 0,
  lowStockChange: 0,
  todayVsYesterday: { sales: 0, profit: 0 },
};
const defaultSalesTrend: SalesTrend = {
  labels: [],
  data: [],
  profits: [],
};

export default function DashboardPage() {
  const router = useRouter();
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
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showDynamicIsland, setShowDynamicIsland] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(() => getCurrentDateInTimezone());
  const hasFetched = useRef(false);

  const stats = dashboardData?.stats || defaultStats;
  const percentageChanges = dashboardData?.percentageChanges || defaultPercentageChanges;
  const salesTrend = dashboardData?.salesTrend || defaultSalesTrend;
  const topProducts = dashboardData?.topProducts || [];
  const recentActivity = dashboardData?.recentActivity || [];

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentDateInTimezone());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const fetchDashboardData = useCallback(async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
        setError(null);
      } else {
        setRefreshing(true);
      }

      const userRes = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!userRes.ok) throw new Error('Unauthorized');
      const userData = await userRes.json();
      setUser(userData.user);

      const analyticsRes = await fetch(`/api/analytics/dashboard?period=${period}`, {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!analyticsRes.ok) throw new Error(`Failed to fetch analytics: ${analyticsRes.status}`);
      const data = await analyticsRes.json();
      setDashboardData(data);
      
      // Set last updated time in local timezone
      setLastUpdated(getCurrentDateInTimezone());
      
      if (showLoading) setLoading(false);
      else setRefreshing(false);
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      setError(error.message || 'Failed to load dashboard data');
      if (showLoading) setLoading(false);
      else setRefreshing(false);
      if (error.message === 'Unauthorized') {
        window.location.href = '/autocityPro/login';
      }
    }
  }, [period]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData(false);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      window.location.href = '/autocityPro/login';
    } catch (error) {
      console.error('Logout failed:', error);
      window.location.href = '/autocityPro/login';
    }
  };

  const handleRefresh = () => fetchDashboardData(false);

  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
    setDashboardData(null);
    
    if (isMobile) setShowMobileFilter(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-QA', {
      style: 'currency',
      currency: 'QAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `QR${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 10000) {
      return `QR${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
  };

  const formatPercentage = (value: number) => {
    if (value === 0) return '0%';
    const formatted = Math.abs(value).toFixed(1);
    return `${value > 0 ? '+' : '-'}${formatted}%`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order': return <ShoppingCart className="h-4 w-4 text-[#E84545]" />;
      case 'inventory': return <Package className="h-4 w-4 text-blue-400" />;
      case 'payment': return <CreditCard className="h-4 w-4 text-green-400" />;
      case 'customer': return <Users className="h-4 w-4 text-yellow-400" />;
      default: return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const periodOptions: { value: PeriodType; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
  ];

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/10 border-t-[#E84545] mx-auto"></div>
          <p className="mt-4 text-white text-lg font-medium">Loading dashboard...</p>
          <p className="text-gray-400 text-sm mt-2">Calculating real-time metrics</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4">
        <div className="text-center max-w-md w-full p-8 bg-[#0A0A0A] rounded-2xl border border-white/5 shadow-2xl">
          <AlertCircle className="h-16 w-16 text-[#E84545] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Unable to Load Dashboard</h2>
          <p className="text-gray-400 mb-6">{error}</p>
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

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e2e8f0',
          font: { family: 'Inter, sans-serif', size: isMobile ? 10 : 12 },
          padding: isMobile ? 12 : 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(10, 10, 10, 0.95)',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        borderColor: '#E84545',
        borderWidth: 1,
        padding: isMobile ? 8 : 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${formatCurrency(context.raw)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: {
          color: '#94a3b8',
          font: { size: isMobile ? 9 : 11 },
          maxRotation: isMobile ? 45 : 0,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: {
          color: '#94a3b8',
          font: { size: isMobile ? 9 : 11 },
          callback: (value: any) => isMobile ? `${value / 1000}K` : formatCurrency(value),
        },
      },
    },
  };

  const salesTrendConfig = {
    labels: salesTrend.labels,
    datasets: [
      {
        label: 'Sales',
        data: salesTrend.data,
        borderColor: '#E84545',
        backgroundColor: 'rgba(232, 69, 69, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: '#E84545',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: isMobile ? 2 : 4,
        pointHoverRadius: isMobile ? 4 : 6,
      },
      {
        label: 'Profit',
        data: salesTrend.profits,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: isMobile ? 2 : 4,
        pointHoverRadius: isMobile ? 4 : 6,
      },
    ],
  };

  const topProductsConfig = {
    labels: topProducts.map(p => isMobile ? p.name.substring(0, 15) + '...' : p.name),
    datasets: [{
      label: 'Revenue',
      data: topProducts.map(p => p.revenue),
      backgroundColor: ['rgba(232, 69, 69, 0.8)', 'rgba(204, 60, 60, 0.8)', 'rgba(176, 51, 51, 0.8)', 'rgba(148, 42, 42, 0.8)', 'rgba(120, 33, 33, 0.8)'],
      borderColor: ['#E84545', '#cc3c3c', '#b03333', '#942a2a', '#782121'],
      borderWidth: 1,
      borderRadius: 6,
    }],
  };

  const statCards = [
    {
      title: "Today's Sales",
      value: formatCompactCurrency(stats.todaySales),
      icon: DollarSign,
      gradient: 'from-[#E84545] to-[#cc3c3c]',
      change: formatPercentage(percentageChanges.todayVsYesterday.sales),
      changePositive: percentageChanges.todayVsYesterday.sales >= 0,
      description: 'vs yesterday',
      mobileTitle: 'Today',
    },
    {
      title: `${period.charAt(0).toUpperCase() + period.slice(1)} Revenue`,
      value: formatCompactCurrency(stats.monthSales),
      icon: TrendingUp,
      gradient: 'from-[#E84545] to-[#cc3c3c]',
      change: formatPercentage(percentageChanges.salesChange),
      changePositive: percentageChanges.salesChange >= 0,
      description: `vs last ${period}`,
      mobileTitle: 'Revenue',
    },
    {
      title: 'Total Profit',
      value: formatCompactCurrency(stats.totalProfit),
      icon: Activity,
      gradient: 'from-green-500 to-emerald-600',
      change: `${stats.profitMargin.toFixed(1)}%`,
      changePositive: stats.profitMargin >= 20,
      description: 'profit margin',
      mobileTitle: 'Profit',
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      icon: AlertCircle,
      gradient: stats.lowStockItems > 0 ? 'from-orange-500 to-red-600' : 'from-green-500 to-emerald-600',
      change: stats.lowStockItems > 0 ? 'Alert' : 'Good',
      changePositive: stats.lowStockItems === 0,
      description: 'items low',
      alert: stats.lowStockItems > 0,
      mobileTitle: 'Stock',
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers.toLocaleString(),
      icon: Users,
      gradient: 'from-blue-500 to-cyan-600',
      change: formatPercentage(percentageChanges.customerChange),
      changePositive: percentageChanges.customerChange >= 0,
      description: 'active users',
      mobileTitle: 'Customers',
    },
  ];

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#050505]">
        {/* Dynamic Island - Mobile Only */}
        {isMobile && showDynamicIsland && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 px-4 pointer-events-none">
            <div className="bg-black rounded-[28px] px-6 py-3 shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-white text-xs font-medium">Live</span>
                </div>
                <div className="h-3 w-px bg-white/20"></div>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-[#E84545]" />
                  <span className="text-white text-xs font-semibold">{formatCompactCurrency(stats.todaySales)}</span>
                </div>
                {stats.lowStockItems > 0 && (
                  <>
                    <div className="h-3 w-px bg-white/20"></div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-orange-500" />
                      <span className="text-orange-400 text-xs font-medium">{stats.lowStockItems}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header - Compact & Fixed */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-gradient-to-br from-[#0A0A0A] via-[#050505] to-[#0A0A0A] border-b border-white/5 backdrop-blur-xl">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-xl bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">Dashboard</h1>
                  <p className="text-xs text-white/60">Hi, {user?.firstName}!</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMobileFilter(true)}
                  className="px-3 py-2 text-xs font-medium bg-[#E84545]/10 border border-[#E84545]/20 rounded-lg text-[#E84545] flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <span>{period.charAt(0).toUpperCase() + period.slice(1)}</span>
                  <ChevronRightIcon className="h-3 w-3" />
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 rounded-lg bg-white/5 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-50 active:scale-95 transition-all"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button 
                  onClick={() => setShowMobileMenu(true)} 
                  className="p-2 rounded-lg bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-xs text-white/40">
                <Clock className="h-3 w-3" />
                <span>Updated {formatTime(lastUpdated)} ({getTimezoneOffset()})</span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Filter Modal */}
        {showMobileFilter && (
          <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-[60] animate-in fade-in duration-200">
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#0A0A0A] to-[#050505] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Select Period</h2>
                <button
                  onClick={() => setShowMobileFilter(false)}
                  className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {periodOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handlePeriodChange(option.value)}
                    className={`p-4 rounded-2xl text-left transition-all active:scale-95 ${
                      period === option.value
                        ? 'bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white shadow-lg shadow-[#E84545]/20'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    <span className="font-semibold text-lg">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Desktop Header */}
        <div className="hidden md:block py-11 bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-xl">
          <div className="px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                  <Sparkles className="h-8 w-8 text-[#E84545]" />
                  Dashboard
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-white/90">
                    Welcome back, <span className="text-[#E84545] font-semibold">{user?.firstName}!</span>
                  </p>
                  {lastUpdated && (
                    <span className="flex items-center gap-1 text-xs text-white/60">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(lastUpdated)} ({getTimezoneOffset()})
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-[#0A0A0A]/50 border border-white/5 rounded-xl p-1 backdrop-blur-sm">
                  {periodOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handlePeriodChange(option.value)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        period === option.value
                          ? 'bg-gradient-to-r from-[#E84545] to-[#cc3c3c] text-white shadow-lg shadow-[#E84545]/20'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-3 bg-[#0A0A0A]/50 border border-white/5 rounded-xl hover:bg-[#0A0A0A] hover:border-[#E84545]/30 transition-all disabled:opacity-50 backdrop-blur-sm shadow-lg"
                >
                  <RefreshCw className={`h-5 w-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 md:px-6 pt-[180px] md:pt-6 pb-6">
          {/* Stats Grid - Mobile Optimized Cards */}
          <div className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              {statCards.map((stat, index) => (
                <div
                  key={stat.title}
                  className="group bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-4 hover:border-[#E84545]/30 hover:shadow-xl hover:shadow-[#E84545]/5 transition-all duration-300 active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`bg-gradient-to-r ${stat.gradient} p-2.5 rounded-xl shadow-lg`}>
                      <stat.icon className="h-4 w-4 text-white" />
                    </div>
                    {stat.alert && (
                      <div className="animate-pulse h-2 w-2 rounded-full bg-[#E84545] shadow-lg shadow-[#E84545]/50"></div>
                    )}
                  </div>
                  <h3 className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5 md:hidden">
                    {stat.mobileTitle}
                  </h3>
                  <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 hidden md:block">
                    {stat.title}
                  </h3>
                  <p className="text-xl md:text-2xl font-bold text-white mb-2 truncate">{stat.value}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className={`text-[10px] md:text-xs font-semibold px-2 py-0.5 rounded-full ${
                      stat.changePositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {stat.change}
                    </span>
                    <p className="text-[10px] md:text-xs text-gray-500 truncate ml-1">{stat.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Summary - Compact Mobile */}
          <div className="mb-6 p-4 md:p-6 bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl backdrop-blur-sm shadow-lg">
            <h2 className="text-base md:text-lg font-bold text-white mb-4 flex items-center">
              <Activity className="h-4 w-4 md:h-5 md:w-5 mr-2 text-[#E84545]" />
              Performance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div className="bg-[#0A0A0A]/50 p-3 md:p-4 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs md:text-sm font-medium text-gray-300">Sales Growth</span>
                  <span className={`text-xs md:text-sm font-bold ${percentageChanges.salesChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercentage(percentageChanges.salesChange)}
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${percentageChanges.salesChange >= 0 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`}
                    style={{ width: `${Math.min(Math.abs(percentageChanges.salesChange), 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="bg-[#0A0A0A]/50 p-3 md:p-4 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs md:text-sm font-medium text-gray-300">Profit Margin</span>
                  <span className={`text-xs md:text-sm font-bold ${stats.profitMargin > 20 ? 'text-green-400' : stats.profitMargin > 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {stats.profitMargin.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${stats.profitMargin > 20 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : stats.profitMargin > 10 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`}
                    style={{ width: `${Math.min(stats.profitMargin, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="bg-[#0A0A0A]/50 p-3 md:p-4 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs md:text-sm font-medium text-gray-300">Avg Order</span>
                  <span className="text-xs md:text-sm font-bold text-[#E84545]">
                    {formatCompactCurrency(stats.averageOrderValue)}
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(stats.averageOrderValue / 5000 * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section - Mobile Optimized */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
            {/* Sales Trend */}
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm md:text-lg font-bold text-white flex items-center">
                    <TrendingUp className="h-4 w-4 md:h-5 md:w-5 mr-2 text-[#E84545]" />
                    Sales Trend
                  </h2>
                  <p className="text-[10px] md:text-sm text-gray-400 mt-1">
                    {period === 'today' ? 'Hourly' : period === 'week' ? 'Last 7 days' : period === 'month' ? 'Last 30 days' : 'Monthly'}
                  </p>
                </div>
              </div>
              <div className="h-48 md:h-64">
                {salesTrend.data.length > 0 ? (
                  <Line data={salesTrendConfig} options={chartOptions} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center">
                    <AlertTriangle className="h-10 w-10 text-gray-600 mb-3" />
                    <p className="text-gray-400 font-medium text-sm">No sales data</p>
                  </div>
                )}
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm md:text-lg font-bold text-white flex items-center">
                    <Package className="h-4 w-4 md:h-5 md:w-5 mr-2 text-[#E84545]" />
                    Top Products
                  </h2>
                  <p className="text-[10px] md:text-sm text-gray-400 mt-1">Best sellers</p>
                </div>
              </div>
              {topProducts.length > 0 ? (
                <div className="space-y-2">
                  {topProducts.slice(0, 5).map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-[#0A0A0A]/50 rounded-xl border border-white/5 hover:border-[#E84545]/20 transition-all active:scale-[0.98]">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E84545] to-[#cc3c3c] flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs md:text-sm font-semibold text-white truncate">{product.name}</p>
                          <p className="text-[10px] md:text-xs text-gray-400">{product.quantity} sold</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-xs md:text-sm font-bold text-[#E84545]">
                          {formatCompactCurrency(product.revenue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center">
                  <Package className="h-10 w-10 text-gray-600 mb-3" />
                  <p className="text-gray-400 font-medium text-sm">No sales data</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2 bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-4 md:p-6">
              <h2 className="text-sm md:text-lg font-bold text-white mb-4 flex items-center">
                <Activity className="h-4 w-4 md:h-5 md:w-5 mr-2 text-[#E84545]" />
                Recent Activity
              </h2>
              <div className="space-y-2 md:space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.slice(0, isMobile ? 3 : 5).map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 bg-[#0A0A0A]/50 rounded-xl hover:bg-[#0A0A0A] transition-all border border-white/5 hover:border-[#E84545]/20 active:scale-[0.98]"
                    >
                      <div className="pt-1 flex-shrink-0">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm text-gray-200 font-medium line-clamp-2">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] md:text-xs text-gray-500">
                          <span>{activity.user}</span>
                          <span>•</span>
                          <span>{getRelativeTime(activity.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium text-sm">No recent activity</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#050505] border border-white/10 rounded-2xl shadow-lg p-4 md:p-6">
              <h2 className="text-sm md:text-lg font-bold text-white mb-4">Quick Actions</h2>
              <div className="space-y-2 md:space-y-3">
                <button
                  onClick={() => router.push('/autocityPro/sales/new')}
                  className="w-full p-3 md:p-4 bg-gradient-to-r from-[#E84545] to-[#cc3c3c] rounded-xl text-white font-semibold hover:from-[#d63d3d] hover:to-[#b53535] transition-all flex items-center justify-between shadow-lg active:scale-[0.98]"
                >
                  <span className="text-sm">New Sale</span>
                  <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
                </button>
                <button
                  onClick={() => router.push('/autocityPro/stock')}
                  className="w-full p-3 bg-[#0A0A0A]/50 border border-white/5 rounded-xl text-gray-300 font-semibold hover:bg-white/5 hover:border-[#E84545]/20 transition-all flex items-center justify-between active:scale-[0.98]"
                >
                  <span className="text-sm">Inventory</span>
                  <Package className="h-4 w-4" />
                </button>
                <button
                  onClick={() => router.push('autocityPro/customers')}
                  className="w-full p-3 bg-[#0A0A0A]/50 border border-white/5 rounded-xl text-gray-300 font-semibold hover:bg-white/5 hover:border-[#E84545]/20 transition-all flex items-center justify-between active:scale-[0.98]"
                >
                  <span className="text-sm">Customers</span>
                  <Users className="h-4 w-4" />
                </button>
                <button
                  onClick={() => router.push('/autocityPro/reports')}
                  className="w-full p-3 bg-[#0A0A0A]/50 border border-white/5 rounded-xl text-gray-300 font-semibold hover:bg-white/5 hover:border-[#E84545]/20 transition-all flex items-center justify-between active:scale-[0.98]"
                >
                  <span className="text-sm">Reports</span>
                  <BarChart3 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5">
                <h3 className="text-xs font-semibold text-gray-400 mb-3">Summary</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-[#0A0A0A]/50 rounded-lg">
                    <span className="text-xs text-gray-400">Orders</span>
                    <span className="text-xs font-bold text-white">{stats.totalOrders}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#0A0A0A]/50 rounded-lg">
                    <span className="text-xs text-gray-400">Margin</span>
                    <span className={`text-xs font-bold ${stats.profitMargin > 20 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {stats.profitMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Action Menu */}
        {showMobileMenu && (
          <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-[60] animate-in fade-in duration-200">
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#0A0A0A] to-[#050505] rounded-t-3xl border-t border-white/10 p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Menu</h2>
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
                    toast.success("Exporting data...");
                    setShowMobileMenu(false);
                  }}
                  className="w-full p-4 bg-[#0A0A0A]/50 border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-[0.98]"
                >
                  <span>Export CSV</span>
                  <FileDown className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    setShowFilters(true);
                    setShowMobileMenu(false);
                  }}
                  className="w-full p-4 bg-[#0A0A0A]/50 border border-white/10 rounded-2xl text-gray-300 font-semibold hover:bg-white/5 transition-all flex items-center justify-between active:scale-[0.98]"
                >
                  <span>Filters</span>
                  <Filter className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Safe Area Bottom Padding */}
      <div className="md:hidden h-24"></div>

      {/* Custom Styles */}
      <style>{`
        @supports (padding: max(0px)) {
          .md\\:hidden.fixed.top-16 {
            padding-top: max(12px, env(safe-area-inset-top));
          }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @keyframes slideInFromTop {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </MainLayout>
  );
}